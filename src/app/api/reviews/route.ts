import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const createReviewSchema = z.object({
  cohabitation_id: z.string().uuid(),
  reviewee_id: z.string().uuid(),
  rent_payment_rating: z.number().int().min(1).max(5).optional(),
  cleanliness_rating: z.number().int().min(1).max(5).optional(),
  respect_rating: z.number().int().min(1).max(5).optional(),
  communication_rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
})

function calculateAverage(reviews: any[], field: string): number | null {
  const validReviews = reviews.filter(r => r[field] != null)
  if (validReviews.length === 0) return null
  return validReviews.reduce((sum, r) => sum + r[field], 0) / validReviews.length
}

// Get reviews for a user or cohabitation
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const { searchParams } = new URL(req.url)
    const targetUserId = searchParams.get('user_id')
    const cohabitationId = searchParams.get('cohabitation_id')
    const type = searchParams.get('type') // 'received' or 'given'

    let query = (supabase as any)
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(
          user_id,
          name,
          profile_photo
        ),
        reviewee:profiles!reviews_reviewee_id_fkey(
          user_id,
          name,
          profile_photo
        ),
        cohabitation:cohabitation_periods(
          id,
          listing_id,
          start_date,
          end_date,
          listing:listings(
            id,
            title,
            city
          )
        )
      `)
      .eq('is_visible', true)

    if (cohabitationId) {
      query = query.eq('cohabitation_id', cohabitationId)
    } else if (targetUserId) {
      if (type === 'given') {
        query = query.eq('reviewer_id', targetUserId)
      } else {
        // Default to received reviews
        query = query.eq('reviewee_id', targetUserId)
      }
    }

    query = query.order('created_at', { ascending: false })

    const { data: reviews, error } = await query

    if (error) throw error

    // Calculate aggregate ratings if fetching for a user
    let aggregate = null
    if (targetUserId && type !== 'given') {
      const validReviews = reviews?.filter((r: any) => r.overall_rating != null) || []
      if (validReviews.length > 0) {
        aggregate = {
          total_reviews: validReviews.length,
          average_overall: validReviews.reduce((sum: number, r: any) => sum + parseFloat(r.overall_rating), 0) / validReviews.length,
          average_rent_payment: calculateAverage(validReviews, 'rent_payment_rating'),
          average_cleanliness: calculateAverage(validReviews, 'cleanliness_rating'),
          average_respect: calculateAverage(validReviews, 'respect_rating'),
          average_communication: calculateAverage(validReviews, 'communication_rating'),
        }
      }
    }

    return apiResponse({
      reviews: reviews || [],
      aggregate,
    }, 200, requestId)
  }
)

// Create a new review
export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Validate input
    let reviewData: z.infer<typeof createReviewSchema>
    try {
      reviewData = await parseBody(req, createReviewSchema)
    } catch {
      throw new ValidationError('Invalid review data')
    }

    const {
      cohabitation_id,
      reviewee_id,
      rent_payment_rating,
      cleanliness_rating,
      respect_rating,
      communication_rating,
      comment,
    } = reviewData

    // At least one rating is required
    if (!rent_payment_rating && !cleanliness_rating && !respect_rating && !communication_rating) {
      return apiResponse({ error: 'At least one rating is required' }, 400, requestId)
    }

    // Verify cohabitation exists and user is a participant
    const { data: cohabitation } = await (supabase as any)
      .from('cohabitation_periods')
      .select('*')
      .eq('id', cohabitation_id)
      .single()

    if (!cohabitation) {
      throw new NotFoundError('Cohabitation period not found')
    }

    // User must be a participant (provider or seeker)
    if (cohabitation.provider_id !== userId && cohabitation.seeker_id !== userId) {
      throw new AuthorizationError('You are not a participant in this cohabitation')
    }

    // Cannot review yourself
    if (reviewee_id === userId) {
      return apiResponse({ error: 'Cannot review yourself' }, 400, requestId)
    }

    // Reviewee must be the other participant
    if (reviewee_id !== cohabitation.provider_id && reviewee_id !== cohabitation.seeker_id) {
      return apiResponse({ error: 'Reviewee must be a participant in the cohabitation' }, 400, requestId)
    }

    // Check if review already exists
    const { data: existingReview } = await (supabase as any)
      .from('reviews')
      .select('id')
      .eq('cohabitation_id', cohabitation_id)
      .eq('reviewer_id', userId)
      .single()

    if (existingReview) {
      return apiResponse({ error: 'You have already submitted a review for this cohabitation' }, 400, requestId)
    }

    // Create review
    const { data: review, error: reviewError } = await (supabase as any)
      .from('reviews')
      .insert({
        cohabitation_id,
        reviewer_id: userId,
        reviewee_id,
        rent_payment_rating,
        cleanliness_rating,
        respect_rating,
        communication_rating,
        comment,
      })
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(
          name,
          profile_photo
        ),
        reviewee:profiles!reviews_reviewee_id_fkey(
          name,
          profile_photo
        )
      `)
      .single()

    if (reviewError) throw reviewError

    return apiResponse({ review }, 201, requestId)
  },
  {
    rateLimit: 'reviewCreate',
    audit: {
      action: 'create',
      resourceType: 'review',
      getResourceId: (_req, res) => res?.review?.id,
    },
  }
)
