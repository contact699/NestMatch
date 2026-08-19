/**
 * Single source of truth for the "Trust Quotient" percentage shown on the
 * Trust Center (`app/verify.tsx`) and the profile tab (`app/(tabs)/profile.tsx`).
 *
 * Keeping the formula here means the two screens can never disagree — which
 * they previously did: verify.tsx counted a pending check as half a factor and
 * profile.tsx counted it as zero.
 */

/** Status of a single verification factor. */
export type TrustFactorStatus = 'verified' | 'pending' | 'unverified'

/** The five factors that make up the Trust Quotient, in display order. */
export const TRUST_FACTOR_KEYS = ['email', 'phone', 'id', 'criminal', 'credit'] as const

export type TrustFactorKey = (typeof TRUST_FACTOR_KEYS)[number]

/** Total number of factors — useful for "N of M factors complete" copy. */
export const TRUST_FACTOR_COUNT = TRUST_FACTOR_KEYS.length

/**
 * A row from the `verifications` table. Only the two fields the score depends
 * on are required, so callers can pass their own wider row types unchanged.
 *
 * `created_at` is optional but recommended: it is the tie-breaker when a user
 * has several rows of the same type and status (see `pickRecord`).
 */
export interface TrustVerificationRecord {
  type: string | null
  status: string | null
  created_at?: string | null
}

/**
 * Raw inputs to the Trust Quotient, mirroring what both screens already load:
 * the `email_verified` / `phone_verified` flags off the user's `profiles` row,
 * plus their `verifications` rows (which carry the id / criminal / credit
 * checks).
 *
 * @property emailVerified - `profiles.email_verified` (null/undefined = not verified).
 * @property phoneVerified - `profiles.phone_verified` (null/undefined = not verified).
 * @property verifications - the user's `verifications` rows; a row with
 *   `status: 'completed'` counts as verified, `'pending'` counts as half, any
 *   other status (or a missing row) counts as zero.
 */
export interface TrustQuotientInput {
  emailVerified?: boolean | null
  phoneVerified?: boolean | null
  verifications?: readonly TrustVerificationRecord[] | null
}

/** Weight each factor status contributes to the score. */
const WEIGHT: Record<TrustFactorStatus, number> = {
  verified: 1,
  pending: 0.5,
  unverified: 0,
}

/**
 * Ordering used to pick one row when a user has several of the same check type
 * — retries, expired attempts and re-runs all leave rows behind. Lower wins.
 */
function statusRank(status: string | null | undefined): number {
  if (status === 'completed') return 0
  if (status === 'pending') return 1
  return 2 // failed / expired / anything unrecognised
}

/** Row creation time as a number; unparseable/missing sorts oldest. */
function createdAtValue(record: TrustVerificationRecord): number {
  if (!record.created_at) return Number.NEGATIVE_INFINITY
  const parsed = Date.parse(record.created_at)
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
}

/**
 * Deterministically choose the row that represents a check type.
 *
 * Previously this was `verifications.find(...)`, which took whichever row the
 * query happened to return first — so a user with both a completed and a failed
 * ID check could see their Trust Quotient flip between page loads. Ordering is
 * now completed > pending > failed/expired, newest `created_at` breaking ties.
 */
function pickRecord(
  verifications: readonly TrustVerificationRecord[],
  type: TrustFactorKey,
): TrustVerificationRecord | null {
  let best: TrustVerificationRecord | null = null

  for (const candidate of verifications) {
    if (candidate.type !== type) continue
    if (!best) {
      best = candidate
      continue
    }

    const rankDelta = statusRank(candidate.status) - statusRank(best.status)
    if (rankDelta < 0 || (rankDelta === 0 && createdAtValue(candidate) > createdAtValue(best))) {
      best = candidate
    }
  }

  return best
}

function certnStatus(
  verifications: readonly TrustVerificationRecord[],
  type: TrustFactorKey,
): TrustFactorStatus {
  const record = pickRecord(verifications, type)
  if (!record) return 'unverified'
  if (record.status === 'completed') return 'verified'
  if (record.status === 'pending') return 'pending'
  return 'unverified'
}

/**
 * Resolve the status of each of the five trust factors.
 *
 * Exposed so screens can render per-factor rows from the same data the score
 * is derived from.
 */
export function computeTrustFactors(
  input: TrustQuotientInput,
): Record<TrustFactorKey, TrustFactorStatus> {
  const verifications = input.verifications ?? []
  return {
    email: input.emailVerified === true ? 'verified' : 'unverified',
    phone: input.phoneVerified === true ? 'verified' : 'unverified',
    id: certnStatus(verifications, 'id'),
    criminal: certnStatus(verifications, 'criminal'),
    credit: certnStatus(verifications, 'credit'),
  }
}

/**
 * Trust Quotient as a whole-number percentage in the range 0–100.
 *
 * A completed factor is worth 1, a pending Certn check is worth 0.5, anything
 * else 0; the total is divided by the five factors and rounded.
 *
 * @param input - profile verification flags + the user's `verifications` rows.
 * @returns an integer between 0 and 100 inclusive.
 */
export function computeTrustQuotient(input: TrustQuotientInput): number {
  const factors = computeTrustFactors(input)
  const total = TRUST_FACTOR_KEYS.reduce((sum, key) => sum + WEIGHT[factors[key]], 0)
  return Math.round((total / TRUST_FACTOR_COUNT) * 100)
}
