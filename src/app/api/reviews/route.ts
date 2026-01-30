import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createReviewSchema = z.object({
  cohabitation_id: z.string().uuid(),
  reviewee_id: z.string().uuid(),
  rent_payment_rating: z.number().int().min(1).max(5).optional(),
  cleanliness_rating: z.number().int().min(1).max(5).optional(),
  respect_rating: z.number().int().min(1).max(5).optional(),
  communication_rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
})

// Get reviews for a user or cohabitation
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
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
    } else if (userId) {
      if (type === 'given') {
        query = query.eq('reviewer_id', userId)
      } else {
        // Default to received reviews
        query = query.eq('reviewee_id', userId)
      }
    }

    query = query.order('created_at', { ascending: false })

    const { data: reviews, error } = await query as { data: any[]; error: any }

    if (error) {
      console.error('Error fetching reviews:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      )
    }

    // Calculate aggregate ratings if fetching for a user
    let aggregate = null
    if (userId && type !== 'given') {
      const validReviews = reviews?.filter(r => r.overall_rating != null) || []
      if (validReviews.length > 0) {
        aggregate = {
          total_reviews: validReviews.length,
          average_overall: validReviews.reduce((sum, r) => sum + parseFloat(r.overall_rating), 0) / validReviews.length,
          average_rent_payment: calculateAverage(validReviews, 'rent_payment_rating'),
          average_cleanliness: calculateAverage(validReviews, 'cleanliness_rating'),
          average_respect: calculateAverage(validReviews, 'respect_rating'),
          average_communication: calculateAverage(validReviews, 'communication_rating'),
        }
      }
    }

    return NextResponse.json({
      reviews: reviews || [],
      aggregate,
    })
  } catch (error) {
    console.error('Error in GET /api/reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateAverage(reviews: any[], field: string): number | null {
  const validReviews = reviews.filter(r => r[field] != null)
  if (validReviews.length === 0) return null
  return validReviews.reduce((sum, r) => sum + r[field], 0) / validReviews.length
}

// Create a new review
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const validationResult = createReviewSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const {
      cohabitation_id,
      reviewee_id,
      rent_payment_rating,
      cleanliness_rating,
      respect_rating,
      communication_rating,
      comment,
    } = validationResult.data

    // At least one rating is required
    if (!rent_payment_rating && !cleanliness_rating && !respect_rating && !communication_rating) {
      return NextResponse.json(
        { error: 'At least one rating is required' },
        { status: 400 }
      )
    }

    // Verify cohabitation exists and user is a participant
    const { data: cohabitation } = await (supabase as any)
      .from('cohabitation_periods')
      .select('*')
      .eq('id', cohabitation_id)
      .single() as { data: any }

    if (!cohabitation) {
      return NextResponse.json(
        { error: 'Cohabitation period not found' },
        { status: 404 }
      )
    }

    // User must be a participant (provider or seeker)
    if (cohabitation.provider_id !== user.id && cohabitation.seeker_id !== user.id) {
      return NextResponse.json(
        { error: 'You are not a participant in this cohabitation' },
        { status: 403 }
      )
    }

    // Cannot review yourself
    if (reviewee_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot review yourself' },
        { status: 400 }
      )
    }

    // Reviewee must be the other participant
    if (reviewee_id !== cohabitation.provider_id && reviewee_id !== cohabitation.seeker_id) {
      return NextResponse.json(
        { error: 'Reviewee must be a participant in the cohabitation' },
        { status: 400 }
      )
    }

    // Check if review already exists
    const { data: existingReview } = await (supabase as any)
      .from('reviews')
      .select('id')
      .eq('cohabitation_id', cohabitation_id)
      .eq('reviewer_id', user.id)
      .single() as { data: any }

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already submitted a review for this cohabitation' },
        { status: 400 }
      )
    }

    // Create review
    const { data: review, error: reviewError } = await (supabase as any)
      .from('reviews')
      .insert({
        cohabitation_id,
        reviewer_id: user.id,
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

    if (reviewError) {
      console.error('Error creating review:', reviewError)
      return NextResponse.json(
        { error: 'Failed to create review' },
        { status: 500 }
      )
    }

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
