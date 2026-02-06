import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, RateLimitEndpoint, rateLimitResponse, detectAbuse } from '@/lib/rate-limit'
import { auditLog, AuditAction } from '@/lib/audit'
import { registerWebhookEvent, completeWebhookEvent, failWebhookEvent, WebhookProvider } from '@/lib/webhook'
import { logger, logApiRequest, logApiResponse } from '@/lib/logger'
import { generateRequestId } from '@/lib/request-context'
import { captureException, createErrorResponse, AppError } from '@/lib/error-reporter'
import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================
// ERROR CLASSES
// ============================================

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found') {
    super(message, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'AuthorizationError'
  }
}

// ============================================
// TYPES
// ============================================

export interface HandlerContext {
  requestId: string
  userId?: string
  supabase: SupabaseClient
  params: Record<string, string>
}

export interface AuditConfig {
  action: AuditAction
  resourceType: string
  getResourceId?: (req: NextRequest, result: any, params?: Record<string, string>) => string | undefined
}

export interface WebhookConfig {
  provider: WebhookProvider
  getEventId: (body: any) => string
  getEventType: (body: any) => string
}

export interface ApiHandlerConfig {
  /** Rate limiting endpoint key */
  rateLimit?: RateLimitEndpoint | false

  /** Audit logging configuration */
  audit?: AuditConfig

  /** Skip authentication (for public endpoints) */
  public?: boolean

  /** Webhook mode (skip auth, add idempotency) */
  webhook?: WebhookConfig
}

type ApiHandler = (
  req: NextRequest,
  context: HandlerContext
) => Promise<Response>

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Create a standardized error response with request ID
 */
function errorResponse(
  message: string,
  status: number,
  requestId: string,
  extra?: Record<string, any>
): Response {
  return NextResponse.json(
    { error: message, requestId, ...extra },
    {
      status,
      headers: { 'X-Request-ID': requestId },
    }
  )
}

/**
 * Create a standardized success response with request ID
 */
export function apiResponse<T>(
  data: T,
  status: number = 200,
  requestId?: string
): Response {
  const headers: Record<string, string> = {}
  if (requestId) {
    headers['X-Request-ID'] = requestId
  }

  return NextResponse.json(data, { status, headers })
}

// ============================================
// MAIN WRAPPER
// ============================================

/**
 * Wrap an API route handler with automatic:
 * - Request ID generation and logging
 * - Authentication check
 * - Rate limiting
 * - Webhook idempotency
 * - Audit logging
 * - Error reporting
 *
 * @example
 * // Protected route with rate limiting
 * export const POST = withApiHandler(
 *   async (req, { userId, supabase, requestId }) => {
 *     const body = await req.json()
 *     // ... handler logic
 *     return apiResponse({ success: true }, 200, requestId)
 *   },
 *   { rateLimit: 'messageSend' }
 * )
 *
 * @example
 * // Webhook route with idempotency
 * export const POST = withApiHandler(
 *   async (req, { requestId }) => {
 *     const body = await req.json()
 *     await processWebhook(body)
 *     return apiResponse({ received: true }, 200, requestId)
 *   },
 *   {
 *     webhook: {
 *       provider: 'stripe',
 *       getEventId: (body) => body.id,
 *       getEventType: (body) => body.type,
 *     }
 *   }
 * )
 */
export function withApiHandler(
  handler: ApiHandler,
  config: ApiHandlerConfig = {}
): (req: NextRequest, routeContext?: { params: Promise<Record<string, string>> }) => Promise<Response> {
  return async (req: NextRequest, routeContext?: { params: Promise<Record<string, string>> }): Promise<Response> => {
    const requestId = generateRequestId()
    const startTime = Date.now()
    const path = req.nextUrl.pathname
    const method = req.method

    let userId: string | undefined
    let supabase: SupabaseClient
    let webhookEventId: string | undefined
    let webhookProvider: WebhookProvider | undefined

    // Log incoming request
    logApiRequest({ requestId, method, path, userId: undefined })

    try {
      // 1. Create Supabase client
      supabase = await createClient() as SupabaseClient

      // 2. Authentication check (unless public or webhook)
      if (!config.public && !config.webhook) {
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          logApiResponse({ requestId, method, path }, 401, Date.now() - startTime)
          return errorResponse('Unauthorized', 401, requestId)
        }

        userId = user.id
      }

      // 3. Rate limiting
      if (config.rateLimit !== false && config.rateLimit && userId) {
        const rateLimitResult = await checkRateLimit(config.rateLimit, userId)

        if (!rateLimitResult.allowed) {
          // Record abuse
          await detectAbuse(config.rateLimit, userId)

          logApiResponse({ requestId, method, path, userId }, 429, Date.now() - startTime)
          return rateLimitResponse(rateLimitResult)
        }
      }

      // 4. Webhook idempotency check
      if (config.webhook) {
        const bodyText = await req.text()
        let body: any

        try {
          body = JSON.parse(bodyText)
        } catch {
          return errorResponse('Invalid JSON body', 400, requestId)
        }

        webhookEventId = config.webhook.getEventId(body)
        webhookProvider = config.webhook.provider
        const eventType = config.webhook.getEventType(body)

        const registration = await registerWebhookEvent(
          webhookProvider,
          webhookEventId,
          eventType,
          body
        )

        if (!registration.success) {
          logger.warn('Webhook registration failed', {
            requestId,
            provider: webhookProvider,
            eventId: webhookEventId,
            error: registration.error,
          })
          return errorResponse(registration.error || 'Webhook processing failed', 500, requestId)
        }

        if (registration.alreadyProcessed) {
          logger.info('Webhook already processed (deduplicated)', {
            requestId,
            provider: webhookProvider,
            eventId: webhookEventId,
          })
          return apiResponse({ received: true, deduplicated: true }, 200, requestId)
        }

        // Reconstruct request with parsed body for handler
        // Store body in a way handler can access
        ;(req as any)._parsedBody = body
      }

      // 5. Resolve route params
      const params = routeContext?.params ? await routeContext.params : {}

      // 6. Execute handler
      const context: HandlerContext = {
        requestId,
        userId,
        supabase,
        params,
      }

      const response = await handler(req, context)

      // 7. Audit logging (on success for mutating operations)
      if (config.audit && userId && response.ok) {
        const clonedResponse = response.clone()
        let responseData: any

        try {
          responseData = await clonedResponse.json()
        } catch {
          responseData = null
        }

        const resourceId = config.audit.getResourceId
          ? config.audit.getResourceId(req, responseData, params)
          : undefined

        await auditLog({
          actorId: userId,
          actorType: 'user',
          action: config.audit.action,
          resourceType: config.audit.resourceType,
          resourceId,
          requestId,
          metadata: { method, path },
        })
      }

      // 8. Mark webhook as complete
      if (webhookProvider && webhookEventId && response.ok) {
        await completeWebhookEvent(webhookProvider, webhookEventId)
      }

      // 9. Log response
      logApiResponse({ requestId, method, path, userId }, response.status, Date.now() - startTime)

      // Add request ID header to response
      const newHeaders = new Headers(response.headers)
      newHeaders.set('X-Request-ID', requestId)

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      })

    } catch (error) {
      const err = error as Error

      // Mark webhook as failed
      if (webhookProvider && webhookEventId) {
        await failWebhookEvent(webhookProvider, webhookEventId, err.message)
      }

      // Report error
      captureException(err, {
        requestId,
        userId,
        path,
        action: method,
      })

      // Log error response
      logApiResponse({ requestId, method, path, userId }, 500, Date.now() - startTime)

      // Handle known error types
      if (err instanceof AppError) {
        const { response, statusCode } = createErrorResponse(err, requestId)
        return NextResponse.json(response, {
          status: statusCode,
          headers: { 'X-Request-ID': requestId },
        })
      }

      // Generic error
      return errorResponse(
        process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        500,
        requestId
      )
    }
  }
}

// ============================================
// CONVENIENCE WRAPPERS
// ============================================

/**
 * Public API handler (no auth required)
 */
export function withPublicHandler(handler: ApiHandler, config: Omit<ApiHandlerConfig, 'public'> = {}) {
  return withApiHandler(handler, { ...config, public: true })
}

/**
 * Webhook handler with idempotency
 */
export function withWebhookHandler(
  handler: ApiHandler,
  webhookConfig: WebhookConfig
) {
  return withApiHandler(handler, { webhook: webhookConfig })
}

/**
 * Admin-only handler (checks is_admin flag)
 */
export function withAdminHandler(
  handler: (req: NextRequest, context: HandlerContext & { isAdmin: true }) => Promise<Response>,
  config: Omit<ApiHandlerConfig, 'public' | 'webhook'> = {}
) {
  return withApiHandler(
    async (req, context) => {
      const { supabase, userId, requestId } = context

      if (!userId) {
        return errorResponse('Unauthorized', 401, requestId)
      }

      // Check admin status
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('is_admin')
        .eq('user_id', userId)
        .single()

      if (!profile?.is_admin) {
        return errorResponse('Forbidden - Admin access required', 403, requestId)
      }

      return handler(req, { ...context, isAdmin: true })
    },
    {
      ...config,
      audit: config.audit || {
        action: 'admin_action',
        resourceType: 'admin',
      },
    }
  )
}

// ============================================
// BODY PARSING HELPERS
// ============================================

/**
 * Get pre-parsed body for webhook handlers
 */
export function getWebhookBody<T = any>(req: NextRequest): T {
  return (req as any)._parsedBody as T
}

/**
 * Parse and validate JSON body with Zod schema
 */
export async function parseBody<T>(
  req: NextRequest,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  // Check for pre-parsed webhook body
  if ((req as any)._parsedBody) {
    return schema.parse((req as any)._parsedBody)
  }

  const body = await req.json()
  return schema.parse(body)
}
