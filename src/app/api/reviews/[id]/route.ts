import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, withPublicHandler, apiResponse, parseBody, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const updateReviewSchema = z.object({
  rent_payment_rating: z.number().int().min(1).max(5).optional(),
  cleanliness_rating: z.number().int().min(1).max(5).optional(),
  respect_rating: z.number().int().min(1).max(5).optional(),
  communication_rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
})

// Get a specific review (public)
export const GET = withPublicHandler(
  async (req, { requestId, params }) => {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { id } = params

    const { data: review, error } = await supabase
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
      .eq('id', id)
      .eq('is_visible', true)
      .single()

    if (error || !review) {
      throw new NotFoundError('Review not found')
    }

    return apiResponse({ review }, 200, requestId)
  },
  { rateLimit: 'search' }
)

// Update a review (only by the reviewer, within 7 days)
export const PUT = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id } = params

    // Get existing review
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single()

    if (!existingReview) {
      throw new NotFoundError('Review not found')
    }

    // Check ownership
    if (existingReview.reviewer_id !== userId) {
      throw new AuthorizationError('You can only edit your own reviews')
    }

    // Check if within edit window (7 days)
    const createdAt = new Date(existingReview.created_at)
    const now = new Date()
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceCreation > 7) {
      throw new ValidationError('Reviews can only be edited within 7 days of creation')
    }

    // Validate input
    let body: z.infer<typeof updateReviewSchema>
    try {
      body = await parseBody(req, updateReviewSchema)
    } catch {
      throw new ValidationError('Invalid review data')
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    const fields = ['rent_payment_rating', 'cleanliness_rating', 'respect_rating', 'communication_rating', 'comment']
    for (const field of fields) {
      if (body[field as keyof typeof body] !== undefined) {
        updateData[field] = body[field as keyof typeof body]
      }
    }

    const { data: review, error: updateError } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', id)
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

    if (updateError) throw updateError

    return apiResponse({ review }, 200, requestId)
  },
  {
    rateLimit: 'default',
    audit: {
      action: 'update',
      resourceType: 'review',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)

// Delete a review (soft delete - hide it)
export const DELETE = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id } = params

    // Get existing review
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single()

    if (!existingReview) {
      throw new NotFoundError('Review not found')
    }

    // Check ownership
    if (existingReview.reviewer_id !== userId) {
      throw new AuthorizationError('You can only delete your own reviews')
    }

    // Soft delete by setting is_visible to false
    const { error: deleteError } = await supabase
      .from('reviews')
      .update({
        is_visible: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (deleteError) throw deleteError

    return apiResponse({ success: true }, 200, requestId)
  },
  {
    rateLimit: 'default',
    audit: {
      action: 'delete',
      resourceType: 'review',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)
