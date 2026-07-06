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

// Upper bound on photos hashed per run (fetch + sharp decode each).
const MAX_HASHED_PHOTOS = 10

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
    // 1. Hash this listing's photos. Bounded: each hash fetches + sharp-decodes
    // an image, so an attacker-controlled unbounded photos array would make
    // this a compute/memory amplifier on owner-triggerable endpoints.
    const hashes = (
      await Promise.all(
        (listing.photos ?? []).slice(0, MAX_HASHED_PHOTOS).map((u) => hashImageUrl(u)),
      )
    ).filter(
      (h): h is string => !!h,
    )
    result.photoHashes = hashes

    // 2. Pull other active listings (different owner) + their photo hashes
    //    (hashes live in the service-role-only listing_moderation table).
    const { data: others } = await supabase
      .from('listings')
      .select('id, user_id, address, city, postal_code')
      .neq('id', listing.id)
      .neq('user_id', listing.user_id)
      .eq('is_active', true)

    const otherIds = (others ?? []).map((o) => o.id)
    const hashesByListing = new Map<string, string[]>()
    if (otherIds.length) {
      const { data: mods } = await supabase
        .from('listing_moderation')
        .select('listing_id, photo_hashes')
        .in('listing_id', otherIds)
      for (const m of mods ?? []) {
        hashesByListing.set(m.listing_id, (m.photo_hashes ?? []) as string[])
      }
    }

    const reuse: Array<{ matched_listing_id: string; distance: number }> = []
    let duplicateOf: string | undefined
    const myKey = normalizeAddressKey(listing as AddressParts)

    for (const o of others ?? []) {
      // Photo reuse: any near-duplicate hash pair.
      let matched = false
      for (const mine of hashes) {
        for (const theirs of hashesByListing.get(o.id) ?? []) {
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

    // 3. Persist hashes + flags to the service-role-only moderation table.
    //    Writes the AUTO flag only — manual_flag is an admin-owned column this
    //    pipeline never touches (the upsert omits it, so it's preserved).
    const isFlagged = !!(result.flags.photo_reuse || result.flags.duplicate_of)
    await supabase.from('listing_moderation').upsert(
      {
        listing_id: listing.id,
        is_flagged: isFlagged,
        flags: result.flags as unknown as Json,
        photo_hashes: hashes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'listing_id' },
    )

    // 4. Auto-file a system report if anything was flagged.
    if (isFlagged && SYSTEM_REPORTER_ID) {
      await supabase.from('reports').insert({
        reporter_id: SYSTEM_REPORTER_ID,
        reported_listing_id: listing.id,
        type: result.flags.duplicate_of ? 'scam' : 'fake',
        description: `[auto] ${buildSummary(result.flags)}`,
        status: 'pending',
      })
    } else if (isFlagged) {
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
