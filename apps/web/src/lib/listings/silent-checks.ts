import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import { hashImageUrl, isNearDuplicate } from './image-hash'
import { normalizeAddressKey, type AddressParts } from './normalize-address'
import { logger } from '@/lib/logger'

type Client = SupabaseClient<Database>

// A sentinel system user id for auto-generated reports. Set SYSTEM_REPORTER_ID in env
// to a real auth.users row owned by the platform; if absent, auto-reports are skipped
// (the flag is still recorded on the listing, and a warning is logged).
const SYSTEM_REPORTER_ID = process.env.SYSTEM_REPORTER_ID || ''

export interface SilentCheckFlags {
  photo_reuse?: Array<{ matched_listing_id: string; distance: number }>
  duplicate_of?: string
}

export interface SilentCheckResult {
  photoHashes: string[]
  flags: SilentCheckFlags
}

interface ListingForChecks {
  id: string
  user_id: string
  photos: string[]
  address: string | null
  city: string | null
  postal_code: string | null
}

/**
 * Compute photo hashes, detect cross-owner photo reuse + duplicate addresses,
 * persist photo_hashes + verification_flags on the listing, and auto-file system
 * reports for any flags. Service-role client required. Never throws.
 */
export async function runSilentChecks(
  supabase: Client,
  listing: ListingForChecks,
): Promise<SilentCheckResult> {
  const result: SilentCheckResult = { photoHashes: [], flags: {} }
  try {
    // 1. Hash this listing's photos.
    const hashes = (await Promise.all((listing.photos ?? []).map((u) => hashImageUrl(u)))).filter(
      (h): h is string => !!h,
    )
    result.photoHashes = hashes

    // 2. Pull other active listings (different owner) for comparison.
    const { data: others } = await supabase
      .from('listings')
      .select('id, user_id, photo_hashes, address, city, postal_code')
      .neq('id', listing.id)
      .neq('user_id', listing.user_id)
      .eq('is_active', true)

    const reuse: Array<{ matched_listing_id: string; distance: number }> = []
    let duplicateOf: string | undefined
    const myKey = normalizeAddressKey(listing as AddressParts)

    for (const o of others ?? []) {
      // Photo reuse: any near-duplicate hash pair.
      let matched = false
      for (const mine of hashes) {
        for (const theirs of (o.photo_hashes ?? []) as string[]) {
          if (isNearDuplicate(mine, theirs)) {
            matched = true
            break
          }
        }
        if (matched) break
      }
      if (matched) reuse.push({ matched_listing_id: o.id, distance: 0 })

      // Duplicate address under a different account.
      if (!duplicateOf && listing.address && normalizeAddressKey(o as AddressParts) === myKey) {
        duplicateOf = o.id
      }
    }

    if (reuse.length) result.flags.photo_reuse = reuse
    if (duplicateOf) result.flags.duplicate_of = duplicateOf

    // 3. Persist hashes + flags.
    await supabase
      .from('listings')
      .update({ photo_hashes: hashes, verification_flags: result.flags as unknown as Json })
      .eq('id', listing.id)

    // 4. Auto-file a system report if anything was flagged.
    const flagged = !!(result.flags.photo_reuse || result.flags.duplicate_of)
    if (flagged && SYSTEM_REPORTER_ID) {
      await supabase.from('reports').insert({
        reporter_id: SYSTEM_REPORTER_ID,
        reported_listing_id: listing.id,
        type: result.flags.duplicate_of ? 'scam' : 'fake',
        description: `[auto] ${buildSummary(result.flags)}`,
        status: 'pending',
      })
    } else if (flagged) {
      logger.warn('listing auto-flagged but SYSTEM_REPORTER_ID unset; report skipped', {
        listingId: listing.id,
        flags: result.flags,
      })
    }
  } catch (err) {
    logger.error('runSilentChecks failed', err instanceof Error ? err : undefined, {
      listingId: listing.id,
    })
  }
  return result
}

function buildSummary(flags: SilentCheckFlags): string {
  const parts: string[] = []
  if (flags.photo_reuse?.length)
    parts.push(`photo reuse vs ${flags.photo_reuse.map((r) => r.matched_listing_id).join(', ')}`)
  if (flags.duplicate_of) parts.push(`duplicate address of ${flags.duplicate_of}`)
  return parts.join('; ')
}
