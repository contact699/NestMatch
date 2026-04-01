/**
 * Error reporting utility for production error tracking
 * Integrates with external services (Sentry, etc.) when configured
 */

import { logger } from '@/lib/logger'
import { getContext, getContextRequestId, getContextUserId } from '@/lib/request-context'

// ============================================
// ERROR TYPES
// ============================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ErrorContext {
  userId?: string
  requestId?: string
  path?: string
  action?: string
  resource?: string
  resourceId?: string
  metadata?: Record<string, unknown>
}

export interface ReportedError {
  id: string
  name: string
  message: string
  stack?: string
  severity: ErrorSeverity
  context: ErrorContext
  timestamp: string
  fingerprint?: string
}

// ============================================
// ERROR FINGERPRINTING
// ============================================

/**
 * Generate a fingerprint for error deduplication
 */
function generateFingerprint(error: Error, context?: ErrorContext): string {
  const parts = [
    error.name,
    error.message.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'UUID'),
    context?.path || '',
    context?.action || '',
  ]
  return parts.join('::')
}

/**
 * Determine error severity based on error type and context
 */
function determineSeverity(error: Error, context?: ErrorContext): ErrorSeverity {
  // Critical: Authentication, payment, data corruption
  if (
    error.name === 'AuthenticationError' ||
    error.message.includes('payment') ||
    error.message.includes('stripe') ||
    context?.resource === 'payment'
  ) {
    return 'critical'
  }

  // High: Database errors, external service failures
  if (
    error.name === 'DatabaseError' ||
    error.message.includes('connection') ||
    error.message.includes('timeout')
  ) {
    return 'high'
  }

  // Medium: Validation errors, business logic errors
  if (
    error.name === 'ValidationError' ||
    error.name === 'BusinessLogicError'
  ) {
    return 'medium'
  }

  // Low: Everything else
  return 'low'
}

// ============================================
// ERROR REPORTING
// ============================================

/**
 * Report an error to the error tracking system
 */
export async function reportError(
  error: Error,
  context?: ErrorContext
): Promise<ReportedError> {
  // Merge with request context
  const requestContext = getContext()
  const fullContext: ErrorContext = {
    userId: context?.userId || getContextUserId(),
    requestId: context?.requestId || getContextRequestId(),
    path: context?.path || requestContext?.path,
    ...context,
  }

  const severity = determineSeverity(error, fullContext)
  const fingerprint = generateFingerprint(error, fullContext)

  const reportedError: ReportedError = {
    id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: error.name,
    message: error.message,
    stack: error.stack,
    severity,
    context: fullContext,
    timestamp: new Date().toISOString(),
    fingerprint,
  }

  // Log the error
  logger.error(error.message, error, {
    requestId: fullContext.requestId,
    userId: fullContext.userId,
    action: fullContext.action,
    resource: fullContext.resource,
    resourceId: fullContext.resourceId,
    severity,
    fingerprint,
  })

  // Send to external service if configured
  if (process.env.SENTRY_DSN) {
    await sendToSentry(reportedError)
  }

  // Store critical errors for alerting
  if (severity === 'critical') {
    await handleCriticalError(reportedError)
  }

  return reportedError
}

/**
 * Report error without throwing
 */
export function captureException(
  error: Error,
  context?: ErrorContext
): void {
  reportError(error, context).catch((e) => {
    logger.error('Failed to report error', e instanceof Error ? e : new Error(String(e)))
  })
}

/**
 * Create and report a custom error
 */
export function reportCustomError(
  name: string,
  message: string,
  context?: ErrorContext
): void {
  const error = new Error(message)
  error.name = name
  captureException(error, context)
}

// ============================================
// EXTERNAL SERVICE INTEGRATION
// ============================================

async function sendToSentry(error: ReportedError): Promise<void> {
  // Sentry integration placeholder
  // In production, use @sentry/nextjs package
  if (process.env.NODE_ENV === 'development') {
    logger.info(`[Sentry] Would send error: ${error.id}`)
    return
  }

  try {
    // Example Sentry API call (actual implementation would use SDK)
    const sentryDsn = process.env.SENTRY_DSN
    if (!sentryDsn) return

    // The actual implementation would use Sentry SDK:
    // Sentry.captureException(error, { contexts: { ... } })
  } catch (e) {
    logger.error('Failed to send to Sentry', e instanceof Error ? e : new Error(String(e)))
  }
}

async function handleCriticalError(error: ReportedError): Promise<void> {
  // For critical errors, we might want to:
  // 1. Send immediate alert (Slack, PagerDuty, etc.)
  // 2. Store in database for review
  // 3. Notify on-call team

  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `:rotating_light: Critical Error: ${error.name}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Critical Error*\n*ID:* ${error.id}\n*Message:* ${error.message}\n*Path:* ${error.context.path || 'N/A'}`,
              },
            },
          ],
        }),
      })
    } catch (e) {
      logger.error('Failed to send Slack alert', e instanceof Error ? e : new Error(String(e)))
    }
  }
}

// ============================================
// ERROR BOUNDARY HELPERS
// ============================================

/**
 * Wrap an async function with error reporting
 */
export function withErrorReporting<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: Partial<ErrorContext>
): T {
  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    try {
      return await fn(...args)
    } catch (error) {
      await reportError(error as Error, context)
      throw error
    }
  }) as T
}

/**
 * Safe execution with error capture (doesn't throw)
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  context?: ErrorContext
): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    captureException(error as Error, context)
    return null
  }
}

// ============================================
// CUSTOM ERROR CLASSES
// ============================================

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, context)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with ID ${id} not found` : `${resource} not found`,
      'NOT_FOUND',
      404,
      { resource, id }
    )
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('Too many requests', 'RATE_LIMIT', 429, { retryAfter })
    this.name = 'RateLimitError'
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`${service} error: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502, { service })
    this.name = 'ExternalServiceError'
  }
}

// ============================================
// API ERROR RESPONSE
// ============================================

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    requestId?: string
    details?: Record<string, unknown>
  }
}

/**
 * Create a standardized API error response
 */
export function createErrorResponse(
  error: Error,
  requestId?: string
): { response: ApiErrorResponse; statusCode: number } {
  if (error instanceof AppError) {
    return {
      response: {
        error: {
          code: error.code,
          message: error.message,
          requestId,
          details: error.context,
        },
      },
      statusCode: error.statusCode,
    }
  }

  // Generic error (hide internal details in production)
  return {
    response: {
      error: {
        code: 'INTERNAL_ERROR',
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'An unexpected error occurred',
        requestId,
      },
    },
    statusCode: 500,
  }
}
