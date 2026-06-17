import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { createServiceClient } from '@/lib/supabase/service'
import { recomputeListingLevel } from '@/lib/listings/sync-verification'

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
 * The image itself is uploaded via the normal photo path; this only records
 * the verification signal.
 */
export const POST = withApiHandler(
  async (req, { userId, params, requestId }) => {
    const { id: listingId } = params
    const body = await parseBody(req, bodySchema)
    const supabase = createServiceClient()

    const { data: listing } = await supabase
      .from('listings')
      .select('id, user_id')
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

    return apiResponse({ ok: true }, 200, requestId)
  },
  { rateLimit: 'listingCreate' },
)
