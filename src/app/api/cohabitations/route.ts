import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const createCohabitationSchema = z.object({
  listing_id: z.string().uuid(),
  seeker_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// Get cohabitations for the current user
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const listingId = searchParams.get('listing_id')

    let query = supabase
      .from('cohabitation_periods')
      .select(`
        *,
        provider:profiles!cohabitation_periods_provider_id_fkey(
          user_id,
          name,
          profile_photo
        ),
        seeker:profiles!cohabitation_periods_seeker_id_fkey(
          user_id,
          name,
          profile_photo
        ),
        listing:listings(
          id,
          title,
          city,
          photos
        ),
        reviews(
          id,
          reviewer_id,
          reviewee_id,
          overall_rating,
          created_at
        )
      `)
      .or(`provider_id.eq.${userId},seeker_id.eq.${userId}`)

    if (status) {
      query = query.eq('status', status)
    }

    if (listingId) {
      query = query.eq('listing_id', listingId)
    }

    query = query.order('created_at', { ascending: false })

    const { data: cohabitations, error } = await query

    if (error) throw error

    // Add review status for each cohabitation
    const enrichedCohabitations = (cohabitations || []).map((cohab: any) => {
      const userHasReviewed = cohab.reviews?.some(
        (r: any) => r.reviewer_id === userId
      )
      const canReview = !userHasReviewed && (
        cohab.status === 'completed' ||
        (cohab.status === 'active' && cohab.start_date && new Date(cohab.start_date) < new Date())
      )

      return {
        ...cohab,
        user_has_reviewed: userHasReviewed,
        can_review: canReview,
        is_provider: cohab.provider_id === userId,
      }
    })

    return apiResponse({ cohabitations: enrichedCohabitations }, 200, requestId)
  },
  { rateLimit: 'default' }
)

// Create a new cohabitation period (provider only)
export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Validate input
    let body: z.infer<typeof createCohabitationSchema>
    try {
      body = await parseBody(req, createCohabitationSchema)
    } catch {
      throw new ValidationError('Invalid cohabitation data')
    }

    const { listing_id, seeker_id, start_date, end_date } = body

    // Verify user owns the listing
    const { data: listing } = await supabase
      .from('listings')
      .select('user_id')
      .eq('id', listing_id)
      .single()

    if (!listing) {
      throw new NotFoundError('Listing not found')
    }

    if (listing.user_id !== userId) {
      throw new AuthorizationError('Only the listing owner can create cohabitation records')
    }

    // Verify seeker exists
    const { data: seeker } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', seeker_id)
      .single()

    if (!seeker) {
      throw new NotFoundError('Seeker profile not found')
    }

    // Check for existing active cohabitation with same seeker
    const { data: existingActive } = await supabase
      .from('cohabitation_periods')
      .select('id')
      .eq('listing_id', listing_id)
      .eq('seeker_id', seeker_id)
      .eq('status', 'active')
      .single()

    if (existingActive) {
      throw new ValidationError('An active cohabitation already exists for this listing and seeker')
    }

    // Create cohabitation
    const { data: cohabitation, error: insertError } = await supabase
      .from('cohabitation_periods')
      .insert({
        listing_id,
        provider_id: userId,
        seeker_id,
        start_date,
        end_date: end_date || null,
        status: 'active',
      })
      .select(`
        *,
        provider:profiles!cohabitation_periods_provider_id_fkey(
          name,
          profile_photo
        ),
        seeker:profiles!cohabitation_periods_seeker_id_fkey(
          name,
          profile_photo
        ),
        listing:listings(
          id,
          title
        )
      `)
      .single()

    if (insertError) throw insertError

    return apiResponse({ cohabitation }, 201, requestId)
  },
  {
    rateLimit: 'default',
    audit: {
      action: 'create',
      resourceType: 'cohabitation',
      getResourceId: (_req, res) => res?.cohabitation?.id,
    },
  }
)
