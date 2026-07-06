import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { deriveListingLevel, type LVRow } from './verification-level'
import { logger } from '@/lib/logger'

type Client = SupabaseClient<Database>

/**
 * Upsert the id_owner signal for a listing based on the owner's user-level
 * verification, then recompute and persist the aggregate listing level.
 * Service-role client required (writes bypass RLS). Never throws.
 */
export async function syncListingIdOwner(
  supabase: Client,
  listingId: string,
  ownerVerificationLevel: 'basic' | 'verified' | 'trusted' | null | undefined,
  nowIso: string,
): Promise<void> {
  try {
    const ownerVerified =
      ownerVerificationLevel === 'verified' || ownerVerificationLevel === 'trusted'
    if (ownerVerified) {
      await supabase.from('listing_verifications').upsert(
        {
          listing_id: listingId,
          type: 'id_owner',
          status: 'completed',
          completed_at: nowIso,
          expires_at: null,
        },
        { onConflict: 'listing_id,type' },
      )
    } else {
      await supabase
        .from('listing_verifications')
        .delete()
        .eq('listing_id', listingId)
        .eq('type', 'id_owner')
    }
    await recomputeListingLevel(supabase, listingId, nowIso)
  } catch (err) {
    logger.error('syncListingIdOwner failed', err instanceof Error ? err : undefined, { listingId })
  }
}

/** Read all signal rows for a listing, derive the level, and persist it. */
export async function recomputeListingLevel(
  supabase: Client,
  listingId: string,
  nowIso: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('listing_verifications')
    .select('type, status, expires_at')
    .eq('listing_id', listingId)
  if (error) {
    logger.error('recomputeListingLevel read failed', undefined, { listingId, err: error.message })
    return
  }
  const level = deriveListingLevel((data ?? []) as LVRow[], nowIso)
  await supabase.from('listings').update({ listing_verification_level: level }).eq('id', listingId)
}
