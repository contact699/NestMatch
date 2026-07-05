import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mocks so the vi.mock factories can reference them.
const { rpcMock, createServiceClientMock } = vi.hoisted(() => {
  const rpcMock = vi.fn()
  const createServiceClientMock = vi.fn(() => ({ rpc: rpcMock }))
  return { rpcMock, createServiceClientMock }
})

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: createServiceClientMock,
}))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))
// getClientIdentifier only calls headers() when no userId is passed; every test
// below passes a userId, but mock it anyway to keep the module import clean.
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Map<string, string>()),
}))

import { checkRateLimit, shouldFailClosed } from '../rate-limit'

beforeEach(() => {
  vi.clearAllMocks()
  createServiceClientMock.mockImplementation(() => ({ rpc: rpcMock }))
})

describe('shouldFailClosed', () => {
  const cases: Array<[string, boolean]> = [
    // Sensitive: auth / verification / payments -> fail closed
    ['login', true],
    ['signup', true],
    ['passwordReset', true],
    ['idVerify', true],
    ['criminalCheck', true],
    ['creditCheck', true],
    ['phoneVerify', true],
    ['paymentCreate', true],
    // Read-heavy / low-risk -> fail open
    ['search', false],
    ['api', false],
    ['default', false],
    ['messageSend', false],
    // Unknown -> fail open
    ['totally_unknown_key', false],
  ]
  it.each(cases)('%s -> failClosed=%s', (endpoint, expected) => {
    expect(shouldFailClosed(endpoint)).toBe(expected)
  })
})

describe('checkRateLimit', () => {
  it('allows when the RPC reports allowed', async () => {
    rpcMock.mockResolvedValue({
      data: [{ allowed: true, remaining: 4, reset_at: '2026-07-05T00:00:00.000Z' }],
      error: null,
    })
    const result = await checkRateLimit('search', 'user_1')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('blocks when the RPC reports not allowed', async () => {
    rpcMock.mockResolvedValue({
      data: [{ allowed: false, remaining: 0, reset_at: '2026-07-05T00:00:00.000Z' }],
      error: null,
    })
    const result = await checkRateLimit('paymentCreate', 'user_1')
    expect(result.allowed).toBe(false)
    expect(result.blocked).toBe(true)
    // This is a genuine limit hit, NOT a fail-closed error.
    expect(result.failClosed).toBeUndefined()
  })

  describe('on RPC error', () => {
    beforeEach(() => {
      rpcMock.mockResolvedValue({ data: null, error: { message: 'db down' } })
    })

    it('fails OPEN for a read-heavy endpoint', async () => {
      const result = await checkRateLimit('search', 'user_1')
      expect(result.allowed).toBe(true)
      expect(result.failClosed).toBeUndefined()
    })

    it('fails CLOSED for a payment endpoint', async () => {
      const result = await checkRateLimit('paymentCreate', 'user_1')
      expect(result.allowed).toBe(false)
      expect(result.failClosed).toBe(true)
      expect(result.blocked).toBe(true)
    })

    it('fails CLOSED for an auth endpoint', async () => {
      const result = await checkRateLimit('login', 'user_1')
      expect(result.allowed).toBe(false)
      expect(result.failClosed).toBe(true)
    })
  })

  describe('on thrown exception', () => {
    beforeEach(() => {
      createServiceClientMock.mockImplementation(() => {
        throw new Error('client init boom')
      })
    })

    it('fails OPEN for a read-heavy endpoint', async () => {
      const result = await checkRateLimit('search', 'user_1')
      expect(result.allowed).toBe(true)
      expect(result.failClosed).toBeUndefined()
    })

    it('fails CLOSED for a verification endpoint', async () => {
      const result = await checkRateLimit('idVerify', 'user_1')
      expect(result.allowed).toBe(false)
      expect(result.failClosed).toBe(true)
    })
  })
})
