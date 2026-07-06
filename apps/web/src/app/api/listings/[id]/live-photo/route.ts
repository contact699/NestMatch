import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { createServiceClient } from '@/lib/supabase/service'
import { recomputeListingLevel } from '@/lib/listings/sync-verification'
import { runSilentChecks } from '@/lib/listings/silent-checks'
import { isAllowedImageUrl } from '@/lib/listings/image-hash'

const bodySchema = z.object({
  photoUrl: z.string().url(),
  capturedAt: z.string(),
  source: z.literal('camera'),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

/**
 * Record a Live Photo capture for a listing: marks the live_photo signal
 * completed (with capture metadata) and recomputes the aggregate level.
 *
 * NOTE: this is WEAK self-attestation. We verify the caller owns the listing and
 * that the photo lives in this listing's own Storage folder, but a determined
 * caller can still POST a non-camera image. The friction + provenance is the
 * signal, not a cryptographic guarantee. Strengthening (server-issued capture
 * nonce/session) is a future improvement.
 */
export const POST = withApiHandler(
  async (req, { userId, params, requestId }) => {
    const { id: listingId } = params
    const body = await parseBody(req, bodySchema)

    // The photo must be in our Storage bucket, under THIS listing's folder.
    if (!isAllowedImageUrl(body.photoUrl) || !body.photoUrl.includes(`/listing-photos/${listingId}/`)) {
      return apiResponse({ error: 'Invalid photo URL' }, 400, requestId)
    }

    const supabase = createServiceClient()

    const { data: listing } = await supabase
      .from('listings')
      .select('id, user_id, photos, address, city, postal_code')
      .eq('id', listingId)
      .single()
    if (!listing || listing.user_id !== userId) {
      return apiResponse({ error: 'Not found' }, 404, requestId)
    }

    const nowIso = new Date().toISOString()
    await supabase.from('listing_verifications').upsert(
      {
        listing_id: listingId,
        type: 'live_photo',
        status: 'completed',
        completed_at: nowIso,
        expires_at: null,
        result: {
          photoUrl: body.photoUrl,
          capturedAt: body.capturedAt,
          source: body.source,
          lat: body.lat ?? null,
          lng: body.lng ?? null,
        },
      },
      { onConflict: 'listing_id,type' },
    )
    await recomputeListingLevel(supabase, listingId, nowIso)

    // Re-run the silent fraud checks INCLUDING the just-submitted live photo:
    // without this, a photo stolen from another listing earns a 'verified'
    // badge on this path without ever being dHash-compared for reuse.
    await runSilentChecks(supabase, {
      id: listing.id,
      user_id: listing.user_id,
      // Live photo first: runSilentChecks caps how many photos it hashes, and
      // the new capture must never fall outside that cap.
      photos: [body.photoUrl, ...(listing.photos ?? [])],
      address: listing.address ?? null,
      city: listing.city ?? null,
      postal_code: listing.postal_code ?? null,
    })

    return apiResponse({ ok: true }, 200, requestId)
  },
  { rateLimit: 'livePhoto' },
)
