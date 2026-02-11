import { createServiceClient } from '@/lib/supabase/service'
import { auditLog } from '@/lib/audit'
import { logger } from '@/lib/logger'

export type WebhookProvider = 'stripe' | 'certn' | 'twilio' | 'other'
export type WebhookStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface WebhookEvent {
  id: string
  provider: WebhookProvider
  eventId: string
  eventType: string
  payload: Record<string, any>
  status: WebhookStatus
  attempts: number
  createdAt: Date
}

export interface WebhookResult {
  success: boolean
  alreadyProcessed: boolean
  event?: WebhookEvent
  error?: string
}

/**
 * Register a webhook event for idempotent processing
 * Returns null if event already exists (duplicate/replay)
 */
export async function registerWebhookEvent(
  provider: WebhookProvider,
  eventId: string,
  eventType: string,
  payload: Record<string, any>
): Promise<WebhookResult> {
  const supabase = createServiceClient()

  try {
    // Try to insert the event (will fail if duplicate due to unique constraint)
    const { data, error } = await supabase
      .from('webhook_events')
      .insert({
        provider,
        event_id: eventId,
        event_type: eventType,
        payload,
        status: 'processing',
        attempts: 1,
        last_attempt_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      // Check if it's a duplicate key error
      if (error.code === '23505') {
        // Event already exists - check its status
        const { data: existing } = await supabase
          .from('webhook_events')
          .select('*')
          .eq('provider', provider)
          .eq('event_id', eventId)
          .single()

        if (existing?.status === 'completed') {
          return {
            success: true,
            alreadyProcessed: true,
            event: mapWebhookEvent(existing),
          }
        }

        // Event exists but not completed - might be a retry or stuck processing
        // Update attempt count and allow reprocessing if status is 'failed' or 'pending'
        if (existing?.status === 'failed' || existing?.status === 'pending') {
          const { data: updated } = await supabase
            .from('webhook_events')
            .update({
              status: 'processing',
              attempts: existing.attempts + 1,
              last_attempt_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single()

          return {
            success: true,
            alreadyProcessed: false,
            event: mapWebhookEvent(updated),
          }
        }

        // Still processing - don't allow concurrent processing
        return {
          success: false,
          alreadyProcessed: false,
          error: 'Event is currently being processed',
        }
      }

      return { success: false, alreadyProcessed: false, error: error.message }
    }

    return {
      success: true,
      alreadyProcessed: false,
      event: mapWebhookEvent(data),
    }
  } catch (error) {
    logger.error('Webhook registration error', error instanceof Error ? error : new Error(String(error)))
    return {
      success: false,
      alreadyProcessed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Mark a webhook event as completed
 */
export async function completeWebhookEvent(
  provider: WebhookProvider,
  eventId: string,
  result?: Record<string, any>
): Promise<void> {
  const supabase = createServiceClient()

  await supabase
    .from('webhook_events')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('provider', provider)
    .eq('event_id', eventId)

  // Audit log
  await auditLog({
    actorType: 'webhook',
    action: 'api_access',
    resourceType: 'webhook',
    resourceId: eventId,
    metadata: { provider, status: 'completed', result },
  })
}

/**
 * Mark a webhook event as failed
 */
export async function failWebhookEvent(
  provider: WebhookProvider,
  eventId: string,
  errorMessage: string
): Promise<void> {
  const supabase = createServiceClient()

  await supabase
    .from('webhook_events')
    .update({
      status: 'failed',
      error_message: errorMessage,
    })
    .eq('provider', provider)
    .eq('event_id', eventId)

  // Audit log
  await auditLog({
    actorType: 'webhook',
    action: 'api_access',
    resourceType: 'webhook',
    resourceId: eventId,
    metadata: { provider, status: 'failed', error: errorMessage },
  })
}

/**
 * Verify webhook signature (provider-specific)
 */
export async function verifyWebhookSignature(
  provider: WebhookProvider,
  payload: string | Buffer,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    switch (provider) {
      case 'stripe': {
        // Stripe signature verification
        const crypto = await import('crypto')
        const elements = signature.split(',')
        const timestamp = elements.find(e => e.startsWith('t='))?.split('=')[1]
        const v1Sig = elements.find(e => e.startsWith('v1='))?.split('=')[1]

        if (!timestamp || !v1Sig) return false

        const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf8')
        const signedPayload = `${timestamp}.${payloadStr}`
        const expectedSig = crypto
          .createHmac('sha256', secret)
          .update(signedPayload)
          .digest('hex')

        // Timing-safe comparison
        return crypto.timingSafeEqual(
          Buffer.from(v1Sig),
          Buffer.from(expectedSig)
        )
      }

      case 'twilio': {
        // Twilio signature verification (simplified)
        const crypto = await import('crypto')
        const expectedSig = crypto
          .createHmac('sha1', secret)
          .update(typeof payload === 'string' ? payload : payload.toString('utf8'))
          .digest('base64')

        return signature === expectedSig
      }

      default:
        // Generic HMAC verification
        const crypto = await import('crypto')
        const expectedSig = crypto
          .createHmac('sha256', secret)
          .update(typeof payload === 'string' ? payload : payload.toString('utf8'))
          .digest('hex')

        return signature === expectedSig
    }
  } catch (error) {
    logger.error('Webhook signature verification error', error instanceof Error ? error : new Error(String(error)))
    return false
  }
}

/**
 * Wrapper for processing webhooks with idempotency
 */
export async function processWebhookIdempotent<T>(
  provider: WebhookProvider,
  eventId: string,
  eventType: string,
  payload: Record<string, any>,
  handler: () => Promise<T>
): Promise<{ result?: T; skipped: boolean; error?: string }> {
  // Register event
  const registration = await registerWebhookEvent(provider, eventId, eventType, payload)

  if (!registration.success) {
    return { skipped: false, error: registration.error }
  }

  if (registration.alreadyProcessed) {
    return { skipped: true }
  }

  // Process event
  try {
    const result = await handler()
    await completeWebhookEvent(provider, eventId, { success: true })
    return { result, skipped: false }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await failWebhookEvent(provider, eventId, errorMessage)
    return { skipped: false, error: errorMessage }
  }
}

// Helper to map database row to WebhookEvent
function mapWebhookEvent(row: any): WebhookEvent {
  return {
    id: row.id,
    provider: row.provider,
    eventId: row.event_id,
    eventType: row.event_type,
    payload: row.payload,
    status: row.status,
    attempts: row.attempts,
    createdAt: new Date(row.created_at),
  }
}
