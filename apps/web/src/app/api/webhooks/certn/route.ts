import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, apiResponse, getWebhookBody } from '@/lib/api/with-handler'
import { createServiceClient } from '@/lib/supabase/service'
import { getCaseStatus, mapCertnStatus } from '@/lib/services/certn'
import { sendEmail } from '@/lib/email'
import { verificationCompleteEmail } from '@/lib/email-templates'
import { logger } from '@/lib/logger'

/** Map internal verification type codes to human-readable labels */
const VERIFICATION_TYPE_LABELS: Record<string, string> = {
  criminal: 'Criminal Background Check',
  credit: 'Credit Check',
  id: 'Identity Verification',
  reference: 'Reference Check',
}

// ============================================
// GET: Challenge-response verification
// ============================================

export async function GET(req: NextRequest) {
  const challenge = req.nextUrl.searchParams.get('challenge')
  if (!challenge) {
    return new NextResponse('Missing challenge', { status: 400 })
  }
  return new NextResponse(challenge, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

// ============================================
// POST: Process CertnCentric webhook events
// ============================================

export const POST = withApiHandler(
  async (req: NextRequest, { requestId }) => {
    const body = getWebhookBody(req)

    const objectId: string | undefined = body.object_id
    const eventType: string | undefined = body.event_type

    // Only process CASE_STATUS_CHANGED events
    if (eventType !== 'CASE_STATUS_CHANGED') {
      logger.info('Ignoring non-status-change webhook event', {
        requestId,
        eventType,
        objectId,
      })
      return apiResponse({ received: true }, 200, requestId)
    }

    if (!objectId) {
      logger.warn('Certn webhook missing object_id', { requestId, body })
      return apiResponse({ error: 'Missing object_id' }, 400, requestId)
    }

    const serviceClient = createServiceClient()

    // Find verification by external_id (the case ID)
    const { data: verification, error: findError } = await serviceClient
      .from('verifications')
      .select('id, user_id, type, status')
      .eq('external_id', objectId)
      .eq('provider', 'certn')
      .single()

    if (findError || !verification) {
      logger.error('Verification not found for Certn case', undefined, {
        requestId,
        objectId,
        error: findError?.message,
      })
      return apiResponse({ error: 'Verification not found' }, 404, requestId)
    }

    // Fetch full case details from CertnCentric API
    const caseResult = await getCaseStatus(objectId)

    if (!caseResult.success || !caseResult.case) {
      // Throw so with-handler marks the webhook event as 'failed' (retryable)
      // and returns 500 to CertnCentric, which will retry with exponential backoff.
      throw new Error(`Failed to fetch case ${objectId} from CertnCentric: ${caseResult.error}`)
    }

    const certnCase = caseResult.case
    const newStatus = mapCertnStatus(certnCase.overall_status)

    logger.info('Processing Certn webhook', {
      requestId,
      objectId,
      eventType,
      overallStatus: certnCase.overall_status,
      mappedStatus: newStatus,
      verificationType: verification.type,
      verificationId: verification.id,
    })

    // Build update payload
    const updateData = {
      status: newStatus,
      result: JSON.parse(JSON.stringify(certnCase)),
      completed_at: undefined as string | undefined,
      expires_at: undefined as string | undefined,
    }

    if (newStatus === 'completed' || newStatus === 'failed') {
      updateData.completed_at = new Date().toISOString()

      if (newStatus === 'completed') {
        const expiresAt = new Date()
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
        updateData.expires_at = expiresAt.toISOString()
      }
    }

    // Update verification record
    const { error: updateError } = await serviceClient
      .from('verifications')
      .update(updateData)
      .eq('id', verification.id)

    if (updateError) {
      logger.error(
        'Failed to update verification from Certn webhook',
        new Error(updateError.message),
        { requestId, verificationId: verification.id }
      )
      throw new Error(`Failed to update verification: ${updateError.message}`)
    }

    // If a criminal case completed, it bundled IDENTITY_VERIFICATION_1.
    // Persist an ID verification row so the Government ID card reflects this.
    if (newStatus === 'completed' && verification.type === 'criminal') {
      const idCheck = certnCase.checks?.find(
        (c) => c.type === 'IDENTITY_VERIFICATION_1' && c.status === 'COMPLETE'
      )
      if (idCheck) {
        await ensureIdVerification(serviceClient, verification.user_id, objectId, certnCase, requestId)
      }
    }

    // On completion, update the user's profile verification_level
    if (newStatus === 'completed') {
      await updateVerificationLevel(serviceClient, verification.user_id, requestId)

      // Send verification complete email (fire and forget)
      void sendVerificationCompleteEmail(
        serviceClient,
        verification.user_id,
        verification.type,
        requestId
      )
    }

    return apiResponse({ received: true }, 200, requestId)
  },
  {
    webhook: {
      provider: 'certn',
      getEventId: (body) => body.event_id,
      getEventType: (body) => body.event_type,
    },
  }
)

// ============================================
// HELPERS
// ============================================

/**
 * When a criminal case completes, it includes IDENTITY_VERIFICATION_1.
 * Persist a derived ID verification row so the Government ID card reflects it.
 *
 * Uses a synthetic external_id (`{caseId}:id-derived`) so it never collides
 * with the criminal row's external_id or any standalone ID case.
 * Never touches existing ID verification rows that are tracking their own cases.
 */
async function ensureIdVerification(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  caseId: string,
  certnCase: Record<string, unknown>,
  requestId: string,
): Promise<void> {
  // Skip if user already has a completed or pending ID verification
  // (pending means they initiated a standalone ID case — don't interfere)
  const { data: existingId } = await serviceClient
    .from('verifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'id')
    .in('status', ['completed', 'pending'])
    .limit(1)

  if (existingId && existingId.length > 0) {
    return
  }

  const now = new Date().toISOString()
  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 1)

  // Synthetic external_id so it's distinct from the criminal case row
  const derivedExternalId = `${caseId}:id-derived`

  await serviceClient
    .from('verifications')
    .insert({
      user_id: userId,
      type: 'id',
      provider: 'certn',
      external_id: derivedExternalId,
      status: 'completed',
      result: JSON.parse(JSON.stringify(certnCase)),
      completed_at: now,
      expires_at: expiresAt.toISOString(),
    })

  logger.info('Persisted derived ID verification from criminal case', {
    requestId,
    userId,
    caseId,
    derivedExternalId,
  })
}

/**
 * Determine and set the user's verification_level based on completed checks.
 *
 * - ANY completed verification → 'verified'
 * - ID + at least one other check completed → 'trusted'
 */
async function updateVerificationLevel(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  requestId: string
): Promise<void> {
  // Fetch all completed verifications for this user
  const { data: completedVerifications, error } = await serviceClient
    .from('verifications')
    .select('type')
    .eq('user_id', userId)
    .eq('provider', 'certn')
    .eq('status', 'completed')

  if (error || !completedVerifications) {
    logger.error('Failed to fetch completed verifications for level update', undefined, {
      requestId,
      userId,
      error: error?.message,
    })
    return
  }

  if (completedVerifications.length === 0) {
    return
  }

  const completedTypes = new Set(completedVerifications.map((v) => v.type))
  const hasId = completedTypes.has('id')
  const otherTypes = ['criminal', 'credit', 'reference'] as const
  const hasOther = otherTypes.some((t) => completedTypes.has(t))

  // ID + at least one other → trusted; any single check → verified
  const verificationLevel = hasId && hasOther ? 'trusted' : 'verified'

  const { error: profileError } = await serviceClient
    .from('profiles')
    .update({
      verification_level: verificationLevel,
      verified_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (profileError) {
    logger.error('Failed to update profile verification_level', new Error(profileError.message), {
      requestId,
      userId,
      verificationLevel,
    })
    return
  }

  logger.info('Updated user verification level', {
    requestId,
    userId,
    verificationLevel,
    completedTypes: Array.from(completedTypes),
  })
}

/**
 * Send a notification email when a verification check completes.
 */
async function sendVerificationCompleteEmail(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  verificationType: string,
  requestId: string
): Promise<void> {
  try {
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('email, name')
      .eq('user_id', userId)
      .single()

    if (!profile?.email) {
      logger.warn('Cannot send verification email — profile or email not found', {
        requestId,
        userId,
      })
      return
    }

    const typeLabel = VERIFICATION_TYPE_LABELS[verificationType] || verificationType
    const { subject, html } = verificationCompleteEmail(profile.name || 'there', typeLabel)

    await sendEmail({ to: profile.email, subject, html })

    logger.info('Sent verification complete email', {
      requestId,
      userId,
      verificationType: typeLabel,
    })
  } catch (error) {
    logger.error(
      'Failed to send verification complete email',
      error instanceof Error ? error : new Error(String(error)),
      { requestId, userId, verificationType }
    )
  }
}
