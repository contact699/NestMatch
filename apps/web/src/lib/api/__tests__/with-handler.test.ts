import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
// withApiHandler is DB- and network-bound through supabase / the rate limiter /
// the webhook ledger. Everything it collaborates with is mocked so the tests
// exercise the wrapper's own control flow: which rate-limit key it derives,
// how it closes out a webhook event, and what it puts in an error body.

const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
  createBearerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

const checkRateLimit = vi.fn()
const detectAbuse = vi.fn()

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
  detectAbuse: (...args: unknown[]) => detectAbuse(...args),
  rateLimitResponse: () =>
    new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 }),
}))

vi.mock('@/lib/audit', () => ({
  auditLog: vi.fn(async () => undefined),
}))

const registerWebhookEvent = vi.fn()
const completeWebhookEvent = vi.fn()
const failWebhookEvent = vi.fn()

vi.mock('@/lib/webhook', () => ({
  registerWebhookEvent: (...args: unknown[]) => registerWebhookEvent(...args),
  completeWebhookEvent: (...args: unknown[]) => completeWebhookEvent(...args),
  failWebhookEvent: (...args: unknown[]) => failWebhookEvent(...args),
  verifyWebhookSignature: vi.fn(async () => true),
}))

const loggerError = vi.fn()

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: (...args: unknown[]) => loggerError(...args),
  },
  logApiRequest: vi.fn(),
  logApiResponse: vi.fn(),
}))

import { withApiHandler, apiResponse, NotFoundError } from '../with-handler'

const allowed = { allowed: true, remaining: 99, resetAt: new Date(Date.now() + 60_000) }

function makeRequest(headers: Record<string, string> = {}, body?: string): NextRequest {
  return new NextRequest('https://app.test/api/thing', {
    method: 'POST',
    headers,
    ...(body === undefined ? {} : { body }),
  })
}

/** Route context Next.js passes as the second argument; none of these routes use params. */
const noParams = { params: Promise.resolve({} as Record<string, string>) }

beforeEach(() => {
  vi.clearAllMocks()
  checkRateLimit.mockResolvedValue(allowed)
  detectAbuse.mockResolvedValue(false)
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
})

// ---------------------------------------------------------------------------
// Rate-limit key derivation
// ---------------------------------------------------------------------------

describe('withApiHandler rate limiting', () => {
  it('prefers the platform-set x-real-ip over the client-supplied x-forwarded-for', async () => {
    const handler = withApiHandler(async (_req, { requestId }) => apiResponse({ ok: true }, 200, requestId), {
      public: true,
      rateLimit: 'api',
    })

    // The attack this encodes: x-forwarded-for is APPENDED to by the edge, so
    // its first hop is whatever the caller wrote. Bucketing on it lets a caller
    // mint a fresh bucket per request. x-real-ip is set by the platform.
    const res = await handler(
      makeRequest({ 'x-forwarded-for': '203.0.113.9, 70.41.3.18', 'x-real-ip': '198.51.100.7' }),
      noParams
    )

    expect(res.status).toBe(200)
    expect(checkRateLimit).toHaveBeenCalledWith('api', undefined, {
      identifier: 'ip:198.51.100.7',
    })
  })

  it('falls back to the first x-forwarded-for hop when x-real-ip is absent', async () => {
    const handler = withApiHandler(async (_req, { requestId }) => apiResponse({ ok: true }, 200, requestId), {
      public: true,
      rateLimit: 'api',
    })

    await handler(makeRequest({ 'x-forwarded-for': '203.0.113.9, 70.41.3.18' }), noParams)

    expect(checkRateLimit).toHaveBeenCalledWith('api', undefined, {
      identifier: 'ip:203.0.113.9',
    })
  })

  it('falls back to "unknown" when no forwarding headers are present', async () => {
    const handler = withApiHandler(async (_req, { requestId }) => apiResponse({ ok: true }, 200, requestId), {
      public: true,
      rateLimit: 'api',
    })

    await handler(makeRequest(), noParams)

    expect(checkRateLimit).toHaveBeenCalledWith('api', undefined, { identifier: 'ip:unknown' })
  })

  it('actually blocks an anonymous caller that is over the limit (previously never checked)', async () => {
    checkRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: new Date(Date.now() + 60_000) })
    const handler = vi.fn(async (_req: NextRequest, ctx: { requestId: string }) =>
      apiResponse({ ok: true }, 200, ctx.requestId)
    )
    const wrapped = withApiHandler(handler, { public: true, rateLimit: 'api' })

    const res = await wrapped(makeRequest({ 'x-forwarded-for': '203.0.113.9' }), noParams)

    expect(res.status).toBe(429)
    expect(handler).not.toHaveBeenCalled()
  })

  it('keeps the per-user bucket for authenticated callers, ignoring their IP header', async () => {
    const handler = withApiHandler(async (_req, { requestId }) => apiResponse({ ok: true }, 200, requestId), {
      rateLimit: 'api',
    })

    await handler(makeRequest({ 'x-forwarded-for': '203.0.113.9' }), noParams)

    expect(checkRateLimit).toHaveBeenCalledWith('api', 'user-1', { identifier: 'user:user-1' })
  })

  it('does not rate limit when rateLimit is false', async () => {
    const handler = withApiHandler(async (_req, { requestId }) => apiResponse({ ok: true }, 200, requestId), {
      public: true,
      rateLimit: false,
    })

    await handler(makeRequest({ 'x-forwarded-for': '203.0.113.9' }), noParams)

    expect(checkRateLimit).not.toHaveBeenCalled()
  })

  it('surfaces 503 (not 429) when the limiter fails closed', async () => {
    checkRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000),
      failClosed: true,
    })
    const handler = withApiHandler(async (_req, { requestId }) => apiResponse({ ok: true }, 200, requestId), {
      public: true,
      rateLimit: 'paymentCreate',
    })

    const res = await handler(makeRequest({ 'x-forwarded-for': '203.0.113.9' }), noParams)

    expect(res.status).toBe(503)
    expect(detectAbuse).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Webhook event lifecycle
// ---------------------------------------------------------------------------

describe('withApiHandler webhook event lifecycle', () => {
  const webhookConfig = {
    webhook: {
      provider: 'stripe' as const,
      getEventId: (body: { id: string }) => body.id,
      getEventType: (body: { type: string }) => body.type,
    },
  }

  beforeEach(() => {
    registerWebhookEvent.mockResolvedValue({ success: true, alreadyProcessed: false })
  })

  function webhookRequest() {
    return makeRequest({ 'content-type': 'application/json' }, JSON.stringify({ id: 'evt_1', type: 'x' }))
  }

  it('completes the event when the handler returns 2xx', async () => {
    const wrapped = withApiHandler(
      async (_req, { requestId }) => apiResponse({ received: true }, 200, requestId),
      webhookConfig
    )

    const res = await wrapped(webhookRequest(), noParams)

    expect(res.status).toBe(200)
    expect(completeWebhookEvent).toHaveBeenCalledWith('stripe', 'evt_1')
    expect(failWebhookEvent).not.toHaveBeenCalled()
  })

  it('marks the event failed when the handler RETURNS a non-2xx response', async () => {
    const wrapped = withApiHandler(
      async (_req, { requestId }) => apiResponse({ error: 'bad payload' }, 400, requestId),
      webhookConfig
    )

    const res = await wrapped(webhookRequest(), noParams)

    expect(res.status).toBe(400)
    expect(completeWebhookEvent).not.toHaveBeenCalled()
    expect(failWebhookEvent).toHaveBeenCalledWith('stripe', 'evt_1', 'Handler returned HTTP 400')
  })

  it('marks the event failed when the handler returns a 500', async () => {
    const wrapped = withApiHandler(
      async (_req, { requestId }) => apiResponse({ error: 'nope' }, 500, requestId),
      webhookConfig
    )

    await wrapped(webhookRequest(), noParams)

    expect(failWebhookEvent).toHaveBeenCalledWith('stripe', 'evt_1', 'Handler returned HTTP 500')
  })

  it('still marks the event failed when the handler throws', async () => {
    const wrapped = withApiHandler(async () => {
      throw new Error('boom')
    }, webhookConfig)

    const res = await wrapped(webhookRequest(), noParams)

    expect(res.status).toBe(500)
    expect(failWebhookEvent).toHaveBeenCalledWith('stripe', 'evt_1', 'boom')
  })

  it('does not touch the ledger for a deduplicated event', async () => {
    registerWebhookEvent.mockResolvedValue({ success: true, alreadyProcessed: true })
    const handler = vi.fn()
    const wrapped = withApiHandler(handler, webhookConfig)

    const res = await wrapped(webhookRequest(), noParams)

    expect(res.status).toBe(200)
    expect(handler).not.toHaveBeenCalled()
    expect(completeWebhookEvent).not.toHaveBeenCalled()
    expect(failWebhookEvent).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Error sanitization
// ---------------------------------------------------------------------------

describe('withApiHandler error sanitization', () => {
  it('does not leak an unexpected error message to the client', async () => {
    const wrapped = withApiHandler(
      async () => {
        throw new Error('relation "profiles" does not exist at postgres://secret-host:5432')
      },
      { public: true }
    )

    const res = await wrapped(makeRequest(), noParams)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Internal server error')
    expect(JSON.stringify(body)).not.toContain('secret-host')
    expect(JSON.stringify(body)).not.toContain('profiles')
    expect(body.requestId).toBeTruthy()
  })

  it('logs the real error server-side with request context', async () => {
    const boom = new Error('postgres connection string leaked here')
    const wrapped = withApiHandler(async () => {
      throw boom
    }, { public: true })

    await wrapped(makeRequest(), noParams)

    const call = loggerError.mock.calls.find((c) => c[0] === 'Unhandled API error')
    expect(call).toBeDefined()
    expect(call?.[1]).toBe(boom)
    expect(call?.[2]).toMatchObject({ path: '/api/thing', method: 'POST' })
  })

  it('still surfaces AppError messages, which are written for users', async () => {
    const wrapped = withApiHandler(async () => {
      throw new NotFoundError('Expense not found')
    }, { public: true })

    const res = await wrapped(makeRequest(), noParams)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.message).toBe('Expense not found')
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('leaves successful responses untouched apart from the request id header', async () => {
    const wrapped = withApiHandler(
      async () => NextResponse.json({ hello: 'world' }, { status: 201 }),
      { public: true }
    )

    const res = await wrapped(makeRequest(), noParams)

    expect(res.status).toBe(201)
    expect(res.headers.get('X-Request-ID')).toBeTruthy()
    await expect(res.json()).resolves.toEqual({ hello: 'world' })
  })
})
