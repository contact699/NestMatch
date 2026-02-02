import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const updateCohabitationSchema = z.object({
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
})

// Get a specific cohabitation
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id } = params

    const { data: cohabitation, error } = await (supabase as any)
      .from('cohabitation_periods')
      .select(`
        *,
        provider:profiles!cohabitation_periods_provider_id_fkey(
          user_id,
          name,
          profile_photo,
          email
        ),
        seeker:profiles!cohabitation_periods_seeker_id_fkey(
          user_id,
          name,
          profile_photo,
          email
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
          rent_payment_rating,
          cleanliness_rating,
          respect_rating,
          communication_rating,
          overall_rating,
          comment,
          created_at,
          reviewer:profiles!reviews_reviewer_id_fkey(
            name,
            profile_photo
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error || !cohabitation) {
      throw new NotFoundError('Cohabitation not found')
    }

    // Verify user is a participant
    if (cohabitation.provider_id !== userId && cohabitation.seeker_id !== userId) {
      throw new AuthorizationError('Access denied')
    }

    // Add review status
    const userHasReviewed = cohabitation.reviews?.some(
      (r: any) => r.reviewer_id === userId
    )
    const canReview = !userHasReviewed && (
      cohabitation.status === 'completed' ||
      (cohabitation.status === 'active' && cohabitation.start_date && new Date(cohabitation.start_date) < new Date())
    )

    return apiResponse({
      cohabitation: {
        ...cohabitation,
        user_has_reviewed: userHasReviewed,
        can_review: canReview,
        is_provider: cohabitation.provider_id === userId,
      },
    }, 200, requestId)
  }
)

// Update a cohabitation (provider only)
export const PUT = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id } = params

    // Get existing cohabitation
    const { data: existingCohabitation } = await (supabase as any)
      .from('cohabitation_periods')
      .select('*')
      .eq('id', id)
      .single()

    if (!existingCohabitation) {
      throw new NotFoundError('Cohabitation not found')
    }

    // Only provider can update
    if (existingCohabitation.provider_id !== userId) {
      throw new AuthorizationError('Only the provider can update the cohabitation')
    }

    // Validate input
    let body: z.infer<typeof updateCohabitationSchema>
    try {
      body = await parseBody(req, updateCohabitationSchema)
    } catch {
      throw new ValidationError('Invalid cohabitation data')
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (body.end_date !== undefined) {
      updateData.end_date = body.end_date
    }

    if (body.status !== undefined) {
      updateData.status = body.status
    }

    const { data: cohabitation, error: updateError } = await (supabase as any)
      .from('cohabitation_periods')
      .update(updateData)
      .eq('id', id)
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

    if (updateError) throw updateError

    return apiResponse({ cohabitation }, 200, requestId)
  },
  {
    audit: {
      action: 'update',
      resourceType: 'cohabitation',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)
