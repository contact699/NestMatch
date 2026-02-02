import { createServiceClient } from '@/lib/supabase/service'
import { headers } from 'next/headers'

export interface RateLimitConfig {
  maxRequests: number
  windowSeconds: number
  identifier?: string // Override default identifier
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  blocked?: boolean
}

// Default rate limit configurations by endpoint type
export const RATE_LIMITS = {
  // Authentication
  login: { maxRequests: 5, windowSeconds: 300 },           // 5 per 5 min
  signup: { maxRequests: 3, windowSeconds: 3600 },         // 3 per hour
  passwordReset: { maxRequests: 3, windowSeconds: 3600 },  // 3 per hour

  // Verification
  phoneVerify: { maxRequests: 3, windowSeconds: 3600 },    // 3 per hour
  idVerify: { maxRequests: 2, windowSeconds: 86400 },      // 2 per day

  // Messaging
  messageSend: { maxRequests: 60, windowSeconds: 60 },     // 60 per minute
  conversationCreate: { maxRequests: 20, windowSeconds: 3600 }, // 20 per hour

  // Uploads
  photoUpload: { maxRequests: 30, windowSeconds: 3600 },   // 30 per hour
  documentUpload: { maxRequests: 10, windowSeconds: 3600 }, // 10 per hour

  // Listings
  listingCreate: { maxRequests: 5, windowSeconds: 3600 },  // 5 per hour
  listingUpdate: { maxRequests: 30, windowSeconds: 3600 }, // 30 per hour

  // Search
  search: { maxRequests: 60, windowSeconds: 60 },          // 60 per minute

  // Suggestions
  suggestionsGenerate: { maxRequests: 1, windowSeconds: 86400 }, // 1 per day

  // Groups
  groupCreate: { maxRequests: 5, windowSeconds: 3600 },    // 5 per hour
  invitationSend: { maxRequests: 20, windowSeconds: 3600 }, // 20 per hour

  // Reports
  reportCreate: { maxRequests: 10, windowSeconds: 3600 },  // 10 per hour

  // Reviews
  reviewCreate: { maxRequests: 10, windowSeconds: 3600 },  // 10 per hour

  // Payments
  paymentCreate: { maxRequests: 10, windowSeconds: 3600 }, // 10 per hour

  // General API
  api: { maxRequests: 100, windowSeconds: 60 },            // 100 per minute
  default: { maxRequests: 60, windowSeconds: 60 },         // 60 per minute
} as const

export type RateLimitEndpoint = keyof typeof RATE_LIMITS

/**
 * Get client identifier from request (user ID or IP)
 */
export async function getClientIdentifier(userId?: string): Promise<string> {
  if (userId) {
    return `user:${userId}`
  }

  const headersList = await headers()
  const forwarded = headersList.get('x-forwarded-for')
  const realIp = headersList.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'

  return `ip:${ip}`
}

/**
 * Check rate limit for an endpoint
 */
export async function checkRateLimit(
  endpoint: RateLimitEndpoint | string,
  userId?: string,
  config?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  try {
    const supabase = createServiceClient()
    const identifier = config?.identifier || await getClientIdentifier(userId)

    const defaultConfig = RATE_LIMITS[endpoint as RateLimitEndpoint] || RATE_LIMITS.api
    const maxRequests = config?.maxRequests || defaultConfig.maxRequests
    const windowSeconds = config?.windowSeconds || defaultConfig.windowSeconds

    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    })

    if (error) {
      console.error('Rate limit check error:', error)
      // Fail open - allow request if rate limit check fails
      return { allowed: true, remaining: maxRequests, resetAt: new Date() }
    }

    const result = data?.[0]
    return {
      allowed: result?.allowed ?? true,
      remaining: result?.remaining ?? maxRequests,
      resetAt: result?.reset_at ? new Date(result.reset_at) : new Date(),
      blocked: !result?.allowed,
    }
  } catch (error) {
    console.error('Rate limit error:', error)
    // Fail open
    return { allowed: true, remaining: 100, resetAt: new Date() }
  }
}

/**
 * Rate limit middleware response helper
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetAt.toISOString(),
        'Retry-After': Math.ceil((result.resetAt.getTime() - Date.now()) / 1000).toString(),
      },
    }
  )
}

/**
 * Record an abuse event
 */
export async function recordAbuseEvent(
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: Record<string, any>,
  userId?: string
): Promise<void> {
  try {
    const supabase = createServiceClient()
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ||
               headersList.get('x-real-ip') ||
               'unknown'

    await supabase.from('abuse_events').insert({
      user_id: userId,
      ip_address: ip,
      event_type: eventType,
      severity,
      details,
    })
  } catch (error) {
    console.error('Failed to record abuse event:', error)
  }
}

/**
 * Detect and record potential abuse patterns
 */
export async function detectAbuse(
  endpoint: string,
  userId?: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  const result = await checkRateLimit(endpoint, userId)

  if (!result.allowed) {
    // User is being rate limited - potential abuse
    await recordAbuseEvent(
      'rate_limit_exceeded',
      result.remaining <= -10 ? 'high' : 'medium',
      {
        endpoint,
        remaining: result.remaining,
        resetAt: result.resetAt,
        ...metadata,
      },
      userId
    )
    return true
  }

  // Check for rapid-fire requests (less than 100ms apart)
  if (result.remaining < 5 && metadata?.requestInterval && metadata.requestInterval < 100) {
    await recordAbuseEvent(
      'rapid_fire',
      'medium',
      { endpoint, interval: metadata.requestInterval },
      userId
    )
  }

  return false
}
