import { describe, it, expect } from 'vitest'
import type Stripe from 'stripe'
import {
  buildExpenseShareUpdate,
  getShareId,
  mapConnectAccountStatus,
  parseChecksNeeded,
  requiresProcessingGuard,
  PAYMENT_DEMOTABLE_STATUSES,
} from '../stripe-webhook-helpers'

const pi = (metadata?: Record<string, string>) =>
  ({ id: 'pi_1', metadata } as unknown as Stripe.PaymentIntent)

describe('getShareId', () => {
  it('returns the share_id when present', () => {
    expect(getShareId(pi({ share_id: 'share_123' }))).toBe('share_123')
  })

  it('returns undefined when metadata is absent', () => {
    expect(getShareId(pi(undefined))).toBeUndefined()
  })

  it('returns undefined when share_id is empty/missing', () => {
    expect(getShareId(pi({}))).toBeUndefined()
    expect(getShareId(pi({ share_id: '' }))).toBeUndefined()
  })
})

describe('buildExpenseShareUpdate', () => {
  const now = '2026-07-05T00:00:00.000Z'

  it('stamps paid_at when transitioning to paid', () => {
    expect(buildExpenseShareUpdate('paid', now)).toEqual({
      status: 'paid',
      updated_at: now,
      paid_at: now,
    })
  })

  it('does NOT stamp paid_at when demoting to pending', () => {
    const update = buildExpenseShareUpdate('pending', now)
    expect(update).toEqual({ status: 'pending', updated_at: now })
    expect(update).not.toHaveProperty('paid_at')
  })
})

describe('requiresProcessingGuard (demotion eligibility)', () => {
  // Table-driven: only demotions to 'pending' must be transition-guarded so a
  // paid share can never regress.
  const cases: Array<[Parameters<typeof requiresProcessingGuard>[0], boolean]> = [
    ['paid', false],
    ['pending', true],
  ]
  it.each(cases)('%s -> guard=%s', (nextStatus, expected) => {
    expect(requiresProcessingGuard(nextStatus)).toBe(expected)
  })
})

describe('PAYMENT_DEMOTABLE_STATUSES', () => {
  it('only allows demoting from non-terminal states', () => {
    expect([...PAYMENT_DEMOTABLE_STATUSES]).toEqual(['pending', 'processing'])
    expect(PAYMENT_DEMOTABLE_STATUSES).not.toContain('completed')
    expect(PAYMENT_DEMOTABLE_STATUSES).not.toContain('refunded')
  })
})

describe('mapConnectAccountStatus', () => {
  const cases: Array<[
    { charges_enabled?: boolean; details_submitted?: boolean },
    'active' | 'restricted' | 'pending'
  ]> = [
    [{ charges_enabled: true, details_submitted: true }, 'active'],
    [{ charges_enabled: true, details_submitted: false }, 'active'],
    [{ charges_enabled: false, details_submitted: true }, 'restricted'],
    [{ charges_enabled: false, details_submitted: false }, 'pending'],
    [{}, 'pending'],
  ]
  it.each(cases)('%o -> %s', (account, expected) => {
    expect(mapConnectAccountStatus(account)).toBe(expected)
  })
})

describe('parseChecksNeeded', () => {
  it('parses a valid JSON array of known check types', () => {
    expect(parseChecksNeeded('["id","credit"]')).toEqual({
      ok: true,
      checks: ['id', 'credit'],
    })
  })

  it('drops unknown check types silently', () => {
    expect(parseChecksNeeded('["id","garbage","criminal"]')).toEqual({
      ok: true,
      checks: ['id', 'criminal'],
    })
  })

  it('treats null/undefined/empty as an empty check list', () => {
    expect(parseChecksNeeded(null)).toEqual({ ok: true, checks: [] })
    expect(parseChecksNeeded(undefined)).toEqual({ ok: true, checks: [] })
    expect(parseChecksNeeded('[]')).toEqual({ ok: true, checks: [] })
  })

  it('reports failure on invalid JSON', () => {
    expect(parseChecksNeeded('{not json')).toEqual({ ok: false })
  })

  it('reports failure on non-array JSON', () => {
    expect(parseChecksNeeded('{"id":true}')).toEqual({ ok: false })
    expect(parseChecksNeeded('"id"')).toEqual({ ok: false })
  })
})
