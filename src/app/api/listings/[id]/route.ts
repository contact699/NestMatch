import { NextRequest } from 'next/server'
import { createClient as createDirectClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { withApiHandler, withPublicHandler, apiResponse, parseBody, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const updateListingSchema = z.object({
  type: z.enum(['room', 'shared_room', 'entire_place']).optional(),
  title: z.string().min(5).max(100).optional(),
  description: z.string().max(2000).optional().nullable(),
  price: z.number().min(0).max(50000).optional(),
  utilities_included: z.boolean().optional(),
  available_date: z.string().optional(),
  minimum_stay: z.number().min(1).max(24).optional(),
  address: z.string().optional().nullable(),
  city: z.string().min(1).optional(),
  province: z.string().min(1).optional(),
  postal_code: z.string().optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  photos: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  roommate_gender_preference: z.enum(['male', 'female', 'any']).optional().nullable(),
  roommate_age_min: z.number().min(18).optional().nullable(),
  roommate_age_max: z.number().max(120).optional().nullable(),
  newcomer_friendly: z.boolean().optional(),
  no_credit_history_ok: z.boolean().optional(),
  is_active: z.boolean().optional(),
})

export const GET = withPublicHandler(
  async (req, { requestId, params }) => {
    const { id } = params

    // Use direct client for public queries
    const supabase = createDirectClient(supabaseUrl, supabaseAnonKey)

    // Get the listing with profile info
    const { data: listing, error } = await supabase
      .from('listings')
      .select(`
        *,
        profiles (
          id,
          user_id,
          name,
          bio,
          profile_photo,
          verification_level,
          languages
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Listing not found')
      }
      throw error
    }

    // Increment view count (fire and forget)
    supabase
      .from('listings')
      .update({ views_count: ((listing as any).views_count || 0) + 1 })
      .eq('id', id)
      .then(() => {})

    return apiResponse({ listing }, 200, requestId)
  }
)

export const PUT = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id } = params

    // Check if user owns this listing
    const { data: existingListing, error: fetchError } = await (supabase as any)
      .from('listings')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingListing) {
      throw new NotFoundError('Listing not found')
    }

    if (existingListing.user_id !== userId) {
      throw new AuthorizationError('Forbidden')
    }

    // Validate input
    let updateData: z.infer<typeof updateListingSchema>
    try {
      updateData = await parseBody(req, updateListingSchema)
    } catch {
      throw new ValidationError('Invalid listing data')
    }

    // Update listing
    const { data: listing, error } = await (supabase as any)
      .from('listings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return apiResponse({ listing }, 200, requestId)
  },
  {
    rateLimit: 'listingUpdate',
    audit: {
      action: 'update',
      resourceType: 'listing',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)

export const DELETE = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id } = params

    // Check if user owns this listing
    const { data: existingListing, error: fetchError } = await (supabase as any)
      .from('listings')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingListing) {
      throw new NotFoundError('Listing not found')
    }

    if (existingListing.user_id !== userId) {
      throw new AuthorizationError('Forbidden')
    }

    // Delete listing
    const { error } = await (supabase as any)
      .from('listings')
      .delete()
      .eq('id', id)

    if (error) throw error

    return apiResponse({ success: true }, 200, requestId)
  },
  {
    audit: {
      action: 'delete',
      resourceType: 'listing',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)
