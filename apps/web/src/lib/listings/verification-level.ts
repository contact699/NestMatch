export type ListingVerificationLevel = 'unverified' | 'verified' | 'trusted'
export type ListingVerificationType = 'id_owner' | 'live_photo' | 'mail' | 'email' | 'phone'

export interface LVRow {
  type: ListingVerificationType
  status: 'pending' | 'completed' | 'failed'
  expires_at: string | null
}

const STRONG: ListingVerificationType[] = ['id_owner', 'live_photo', 'mail']

function activeStrongTypes(rows: LVRow[], nowIso: string): Set<ListingVerificationType> {
  const now = new Date(nowIso).getTime()
  const set = new Set<ListingVerificationType>()
  for (const r of rows) {
    if (r.status !== 'completed') continue
    if (!STRONG.includes(r.type)) continue
    if (r.expires_at && new Date(r.expires_at).getTime() <= now) continue
    set.add(r.type)
  }
  return set
}

/** Derive a listing's aggregate verification level from its signal rows. */
export function deriveListingLevel(rows: LVRow[], nowIso: string): ListingVerificationLevel {
  const strong = activeStrongTypes(rows, nowIso)
  if (strong.size >= 2) return 'trusted'
  if (strong.size === 1) return 'verified'
  return 'unverified'
}
