import type Stripe from 'stripe'
import type { CertnVerificationType } from '@/lib/services/certn'

/**
 * Pure, side-effect-free helpers extracted from the Stripe webhook route so the
 * security-critical decisions (status transitions, demotion guards, metadata
 * parsing) can be unit tested without a live Stripe/Supabase environment.
 */

/** Terminal-ish expense_share status the webhook may move a row to. */
export type ShareNextStatus = 'paid' | 'pending'

/** Update patch applied to an `expense_shares` row. */
export interface ExpenseShareUpdate {
  status: ShareNextStatus
  updated_at: string
  paid_at?: string
}

/**
 * Statuses a `payments` row may be demoted FROM. A demotion (failed/cancelled)
 * must never overwrite a terminal success/refund state, otherwise an
 * out-of-order or replayed Stripe event could regress a completed payment.
 */
export const PAYMENT_DEMOTABLE_STATUSES = ['pending', 'processing'] as const

/**
 * Pull the bill-split share id off a payment intent's metadata.
 * Returns undefined for non-split payments (e.g. verification checkouts).
 */
export function getShareId(paymentIntent: Stripe.PaymentIntent): string | undefined {
  const shareId = paymentIntent.metadata?.share_id
  return shareId ? shareId : undefined
}

/**
 * Build the update patch for an expense_share transition.
 * `paid` stamps paid_at; `pending` (a demotion/unstick) does not.
 */
export function buildExpenseShareUpdate(
  nextStatus: ShareNextStatus,
  now: string = new Date().toISOString()
): ExpenseShareUpdate {
  const update: ExpenseShareUpdate = {
    status: nextStatus,
    updated_at: now,
  }
  if (nextStatus === 'paid') {
    update.paid_at = now
  }
  return update
}

/**
 * Whether an expense_share transition must be guarded so it only applies when
 * the row is currently 'processing'. Demotions to 'pending' MUST be guarded so
 * a late/replayed failed/canceled event can never regress an already-paid share
 * (which would re-prompt the user to pay a second time). Promotions to 'paid'
 * are unconditional.
 */
export function requiresProcessingGuard(nextStatus: ShareNextStatus): boolean {
  return nextStatus === 'pending'
}

/**
 * Map a Stripe Connect account's flags to our payout_accounts.status value.
 */
export function mapConnectAccountStatus(account: {
  charges_enabled?: boolean | null
  details_submitted?: boolean | null
}): 'active' | 'restricted' | 'pending' {
  if (account.charges_enabled) return 'active'
  if (account.details_submitted) return 'restricted'
  return 'pending'
}

/** Valid Certn check types we accept from checkout metadata. */
const CERTN_CHECK_TYPES: readonly CertnVerificationType[] = ['id', 'criminal', 'credit']

/** Runtime type guard narrowing an unknown value to a CertnVerificationType. */
export function isCertnCheckType(value: unknown): value is CertnVerificationType {
  return typeof value === 'string' && (CERTN_CHECK_TYPES as readonly string[]).includes(value)
}

/**
 * Parse the `checks_needed` metadata JSON into a list of valid Certn check
 * types. Invalid JSON or non-array payloads yield `{ ok: false }`; unknown
 * entries are dropped so a malformed value can never reach the provider.
 */
export function parseChecksNeeded(
  raw: string | undefined | null
): { ok: true; checks: CertnVerificationType[] } | { ok: false } {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw || '[]')
  } catch {
    return { ok: false }
  }
  if (!Array.isArray(parsed)) return { ok: false }
  return { ok: true, checks: parsed.filter(isCertnCheckType) }
}
