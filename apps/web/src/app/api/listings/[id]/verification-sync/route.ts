import { withApiHandler, apiResponse, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'
import { createServiceClient } from '@/lib/supabase/service'
import { syncListingIdOwner } from '@/lib/listings/sync-verification'
import { runSilentChecks } from '@/lib/listings/silent-checks'

/**
 * Re-run the server-side verification pipeline for a listing the caller owns.
 *
 * Exists so clients that create listings without going through the web POST
 * /api/listings route (e.g. the native app, which inserts into Supabase
 * directly) can still trigger `syncListingIdOwner` + `runSilentChecks`. Mirrors
 * the verification steps in POST /api/listings.
 *
 * Owner-only (404 if the listing isn't visible to the caller under RLS, 403 if
 * it exists but belongs to someone else). Idempotent, but NOT cheap — it
 * re-hashes the listing's photos (bounded) — hence the tight rate limit.
 */
export const POST = withApiHandler(
  async (_req, { userId, supabase, requestId, params }) => {
    const { id: listingId } = params

    // Ownership check via the caller-scoped client (RLS + explicit compare).
    const { data: listing, error } = await supabase
      .from('listings')
      .select('id, user_id, photos, address, city, postal_code')
      .eq('id', listingId)
      .single()

    if (error || !listing) {
      throw new NotFoundError('Listing not found')
    }
    if (listing.user_id !== userId) {
      throw new AuthorizationError('Forbidden')
    }

    // Verification writes touch service-role-only tables (listing_verifications,
    // listing_moderation), so they must run under the service client.
    const writeClient = createServiceClient()
    const nowIso = new Date().toISOString()

    const { data: ownerProfile } = await writeClient
      .from('profiles')
      .select('verification_level')
      .eq('user_id', userId!)
      .single()

    await syncListingIdOwner(
      writeClient,
      listing.id,
      ownerProfile?.verification_level ?? null,
      nowIso,
    )
    await runSilentChecks(writeClient, {
      id: listing.id,
      user_id: userId!,
      photos: listing.photos ?? [],
      address: listing.address ?? null,
      city: listing.city ?? null,
      postal_code: listing.postal_code ?? null,
    })

    // Re-read the derived aggregate level so the client can update its UI.
    const { data: finalListing } = await writeClient
      .from('listings')
      .select('listing_verification_level')
      .eq('id', listing.id)
      .single()

    return apiResponse(
      { listing_verification_level: finalListing?.listing_verification_level ?? 'unverified' },
      200,
      requestId,
    )
  },
  { rateLimit: 'verificationSync' },
)
