import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------
// A minimal chainable stand-in for a PostgREST query builder: every filter
// returns itself, and the builder resolves (await / .maybeSingle()) to a fixed
// { data, error } result.

type Result = { data: unknown; error: { code?: string; message?: string } | null }

interface FakeQuery {
  select: (...args: unknown[]) => FakeQuery
  delete: (...args: unknown[]) => FakeQuery
  eq: (...args: unknown[]) => FakeQuery
  neq: (...args: unknown[]) => FakeQuery
  in: (...args: unknown[]) => FakeQuery
  order: (...args: unknown[]) => FakeQuery
  limit: (...args: unknown[]) => FakeQuery
  maybeSingle: () => Promise<Result>
  single: () => Promise<Result>
  then: (resolve: (v: Result) => unknown, reject?: (e: unknown) => unknown) => Promise<unknown>
}

function makeQuery(result: Result): FakeQuery {
  const q: FakeQuery = {
    select: () => q,
    delete: () => q,
    eq: () => q,
    neq: () => q,
    in: () => q,
    order: () => q,
    limit: () => q,
    maybeSingle: async () => result,
    single: async () => result,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  }
  return q
}

const userFrom = vi.fn()
const serviceFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: userFrom })),
  createBearerClient: vi.fn(() => ({ auth: { getUser: mockGetUser }, from: userFrom })),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({ from: serviceFrom })),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, remaining: 99, resetAt: new Date() })),
  detectAbuse: vi.fn(async () => false),
  rateLimitResponse: () => new Response('{}', { status: 429 }),
}))

vi.mock('@/lib/audit', () => ({ auditLog: vi.fn(async () => undefined) }))

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logApiRequest: vi.fn(),
  logApiResponse: vi.fn(),
}))

import { DELETE } from '../[id]/route'

const EXPENSE_ID = '11111111-1111-4111-8111-111111111111'

function call(id = EXPENSE_ID) {
  const req = new NextRequest(`https://app.test/api/expenses/${id}`, { method: 'DELETE' })
  return DELETE(req, { params: Promise.resolve({ id }) })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'creator-1' } }, error: null })
  serviceFrom.mockImplementation((table: string) =>
    table === 'expense_shares' ? makeQuery({ data: [], error: null }) : makeQuery({ data: null, error: null })
  )
})

describe('DELETE /api/expenses/[id]', () => {
  it('returns 204 with no body when the creator deletes their own expense', async () => {
    userFrom.mockReturnValue(makeQuery({ data: { id: EXPENSE_ID, created_by: 'creator-1' }, error: null }))

    const res = await call()

    expect(res.status).toBe(204)
    await expect(res.text()).resolves.toBe('')
    // The write must go through the service client — shared_expenses has no
    // DELETE policy, so a user-scoped delete would match zero rows silently.
    expect(serviceFrom).toHaveBeenCalledWith('shared_expenses')
  })

  it('returns 403 when a participant who is not the creator tries to delete', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'participant-2' } }, error: null })
    userFrom.mockReturnValue(makeQuery({ data: { id: EXPENSE_ID, created_by: 'creator-1' }, error: null }))

    const res = await call()
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error.code).toBe('FORBIDDEN')
    expect(serviceFrom).not.toHaveBeenCalledWith('shared_expenses')
  })

  it('returns 404 when the expense does not exist or is invisible to the caller', async () => {
    userFrom.mockReturnValue(makeQuery({ data: null, error: null }))

    const res = await call()

    expect(res.status).toBe(404)
    expect(serviceFrom).not.toHaveBeenCalled()
  })

  it('returns 404 rather than 500 for a non-uuid id', async () => {
    userFrom.mockReturnValue(makeQuery({ data: null, error: { code: '22P02', message: 'invalid input syntax for type uuid' } }))

    const res = await call('not-a-uuid')

    expect(res.status).toBe(404)
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } })

    const res = await call()

    expect(res.status).toBe(401)
    expect(userFrom).not.toHaveBeenCalled()
  })

  it('returns 409 without deleting when another participant has settled their share', async () => {
    userFrom.mockReturnValue(makeQuery({ data: { id: EXPENSE_ID, created_by: 'creator-1' }, error: null }))
    serviceFrom.mockImplementation((table: string) =>
      table === 'expense_shares'
        ? makeQuery({ data: [{ id: 'share-1' }], error: null })
        : makeQuery({ data: null, error: null })
    )

    const res = await call()
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toBe("This expense has recorded payments and can't be deleted.")
    // The cascade would take expense_shares — and the payments' only link to
    // what they were for — with it, so nothing may be deleted here.
    expect(serviceFrom).not.toHaveBeenCalledWith('shared_expenses')
  })

  it('returns 500 (sanitized) when the delete itself fails', async () => {
    userFrom.mockReturnValue(makeQuery({ data: { id: EXPENSE_ID, created_by: 'creator-1' }, error: null }))
    serviceFrom.mockImplementation((table: string) =>
      table === 'expense_shares'
        ? makeQuery({ data: [], error: null })
        : makeQuery({ data: null, error: { code: '23503', message: 'update or delete violates foreign key' } })
    )

    const res = await call()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Failed to delete expense')
    expect(JSON.stringify(body)).not.toContain('foreign key')
  })
})
