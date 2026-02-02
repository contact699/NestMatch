import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody, NotFoundError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const saveSchema = z.object({
  listing_id: z.string().uuid('Invalid listing ID'),
})

export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Get saved listings with full listing data
    const { data: savedListings, error } = await (supabase as any)
      .from('saved_listings')
      .select(`
        id,
        created_at,
        listings (
          *,
          profiles (
            id,
            user_id,
            name,
            profile_photo,
            verification_level
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform the data to include listing directly
    const listings = (savedListings || [])
      .filter((s: any) => s.listings !== null)
      .map((s: any) => ({
        ...s.listings,
        saved_at: s.created_at,
        saved_id: s.id,
      }))

    return apiResponse({ listings }, 200, requestId)
  }
)

export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Validate input
    let body: z.infer<typeof saveSchema>
    try {
      body = await parseBody(req, saveSchema)
    } catch {
      throw new ValidationError('listing_id is required')
    }

    const { listing_id } = body

    // Check if listing exists
    const { data: listing, error: listingError } = await (supabase as any)
      .from('listings')
      .select('id')
      .eq('id', listing_id)
      .single()

    if (listingError || !listing) {
      throw new NotFoundError('Listing not found')
    }

    // Check if already saved
    const { data: existing } = await (supabase as any)
      .from('saved_listings')
      .select('id')
      .eq('user_id', userId)
      .eq('listing_id', listing_id)
      .single()

    if (existing) {
      return apiResponse({ error: 'Listing already saved' }, 409, requestId)
    }

    // Save listing
    const { data: saved, error } = await (supabase as any)
      .from('saved_listings')
      .insert({
        user_id: userId,
        listing_id,
      })
      .select()
      .single()

    if (error) throw error

    return apiResponse({ saved }, 201, requestId)
  },
  { rateLimit: 'default' }
)
