// CertnCentric API service wrapper
// Documentation: Settings > Integrations > Documentation in CertnCentric portal
// OpenAPI spec: Certn API.yaml
//
// Auth: Api-Key header (NOT Bearer, NOT OAuth)
// Base URL (Canada): https://api.ca.certn.co
// Endpoint: POST /api/public/cases/order/

import { logger } from '@/lib/logger'

const CERTN_API_KEY = process.env.CERTN_API_KEY
const CERTN_API_BASE = process.env.CERTN_API_BASE || 'https://api.ca.certn.co'

// ============================================
// TYPES
// ============================================

export type CertnVerificationType = 'id' | 'criminal' | 'credit'

/** Check type identifiers used by the CertnCentric API */
interface CertnCheckConfig {
  /** The check_types_with_arguments to include in the case order */
  checks: Record<string, Record<string, unknown>>
}

/** A check within a case */
export interface CertnCheck {
  id: string
  short_id: string
  status: string
  score: string | null
  sub_score: string | null
  adjudication_score: string | null
  adjudication_sub_score: string | null
  type: string
  output_claims: Record<string, unknown>
}

/** Full case object from CertnCentric */
export interface CertnCase {
  id: string
  short_id: string
  created: string
  overall_score: string | null
  overall_status: string
  email_address: string
  input_claims: Record<string, unknown>
  check_types_with_arguments: Record<string, Record<string, unknown>>
  checks: CertnCheck[]
  tags: string[]
  invite_link: string | null
  [key: string]: unknown
}

/** Normalized response returned by our service functions */
export interface CertnResponse {
  success: boolean
  caseId?: string
  status?: string
  error?: string
}

/** Webhook event payload from CertnCentric */
export interface CertnWebhookPayload {
  created: string
  event_id: string
  event_type: string
  object_id: string
  object_type: string
}

// ============================================
// CHECK TYPE CONFIGURATION
// ============================================

/**
 * Maps our verification type to CertnCentric check_types_with_arguments.
 *
 * Criminal is a waterfall check — it requires IDENTITY_VERIFICATION_1
 * on the same case, so we always include it.
 */
const CHECK_CONFIGS: Record<CertnVerificationType, CertnCheckConfig> = {
  id: {
    checks: {
      IDENTITY_VERIFICATION_1: {},
    },
  },
  criminal: {
    // Waterfall: criminal requires identity verification on same case
    checks: {
      IDENTITY_VERIFICATION_1: {},
      CRIMINAL_RECORD_REPORT_1: {
        ordering_type: 'EXPLICIT_ORDERING',
        explicit_check_type: ['BASIC_CANADIAN_CRIMINAL_RECORD_REPORT_1'],
      },
    },
  },
  credit: {
    checks: {
      CREDIT_REPORT_1: {
        ordering_type: 'EXPLICIT_ORDERING',
        explicit_check_type: ['CANADIAN_CREDIT_REPORT_1'],
      },
    },
  },
}

// ============================================
// AUTH
// ============================================

function getAuthHeaders(): Record<string, string> {
  return {
    Authorization: `Api-Key ${CERTN_API_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Create a case (invite) for the given verification type.
 * The applicant receives an email from Certn to complete the checks.
 */
export async function initiateVerification(
  type: CertnVerificationType,
  email: string,
): Promise<CertnResponse> {
  if (!CERTN_API_KEY) {
    logger.error('Certn API key not configured')
    return {
      success: false,
      error: 'Verification is not yet available. Please try again later.',
    }
  }

  const config = CHECK_CONFIGS[type]

  const body = {
    email_address: email,
    send_invite_email: true,
    check_types_with_arguments: config.checks,
  }

  try {
    const response = await fetch(`${CERTN_API_BASE}/api/public/cases/order/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      logger.error('Certn API error', new Error(JSON.stringify(data)), {
        action: 'certn_order',
        resource: type,
        status: response.status,
      })
      return {
        success: false,
        error: data.errors?.[0]?.detail || data.detail || 'Failed to initiate verification',
      }
    }

    return {
      success: true,
      caseId: data.id,
      status: 'CASE_ORDERED',
    }
  } catch (error) {
    logger.error(
      `Error initiating Certn ${type} verification`,
      error instanceof Error ? error : new Error(String(error)),
      { action: 'certn_order', resource: type },
    )
    return {
      success: false,
      error: `Failed to initiate ${type} verification`,
    }
  }
}

/**
 * Fetch a case by ID to check its current status and check results.
 */
export async function getCaseStatus(caseId: string): Promise<{
  success: boolean
  case?: CertnCase
  error?: string
}> {
  if (!CERTN_API_KEY) {
    logger.error('Certn API key not configured')
    return { success: false, error: 'Verification is not yet available.' }
  }

  try {
    const response = await fetch(
      `${CERTN_API_BASE}/api/public/cases/${caseId}/`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      },
    )

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      logger.error('Certn case fetch error', new Error(JSON.stringify(data)), {
        action: 'certn_case_status',
        resourceId: caseId,
        status: response.status,
      })
      return {
        success: false,
        error: data.detail || 'Failed to check verification status',
      }
    }

    return {
      success: true,
      case: data as CertnCase,
    }
  } catch (error) {
    logger.error(
      'Error fetching Certn case',
      error instanceof Error ? error : new Error(String(error)),
      { action: 'certn_case_status', resourceId: caseId },
    )
    return { success: false, error: 'Failed to check verification status' }
  }
}

// ============================================
// STATUS MAPPING
// ============================================

/**
 * Map a CertnCentric case overall_status to our internal verification status.
 */
export function mapCertnStatus(
  overallStatus: string,
): 'pending' | 'completed' | 'failed' {
  switch (overallStatus) {
    case 'COMPLETE':
      return 'completed'
    case 'CANCELLED':
    case 'EXPIRED':
      return 'failed'
    // CASE_ORDERED, AWAITING_APPLICANT_SUBMISSION, IN_PROGRESS, etc.
    default:
      return 'pending'
  }
}

// Backward compat aliases
export const initiateIDVerification = (email: string) =>
  initiateVerification('id', email)
export const checkVerificationStatus = getCaseStatus
export const checkApplicationStatus = getCaseStatus
