import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateReviewSchema = z.object({
  rent_payment_rating: z.number().int().min(1).max(5).optional(),
  cleanliness_rating: z.number().int().min(1).max(5).optional(),
  respect_rating: z.number().int().min(1).max(5).optional(),
  communication_rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
})

// Get a specific review
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: review, error } = await (supabase as any)
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
      .single() as { data: any; error: any }

    if (error || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ review })
  } catch (error) {
    console.error('Error in GET /api/reviews/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update a review (only by the reviewer, within 7 days)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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

    // Get existing review
    const { data: existingReview } = await (supabase as any)
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single() as { data: any }

    if (!existingReview) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (existingReview.reviewer_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own reviews' },
        { status: 403 }
      )
    }

    // Check if within edit window (7 days)
    const createdAt = new Date(existingReview.created_at)
    const now = new Date()
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceCreation > 7) {
      return NextResponse.json(
        { error: 'Reviews can only be edited within 7 days of creation' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = updateReviewSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    const fields = ['rent_payment_rating', 'cleanliness_rating', 'respect_rating', 'communication_rating', 'comment']
    for (const field of fields) {
      if (validationResult.data[field as keyof typeof validationResult.data] !== undefined) {
        updateData[field] = validationResult.data[field as keyof typeof validationResult.data]
      }
    }

    const { data: review, error: updateError } = await (supabase as any)
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

    if (updateError) {
      console.error('Error updating review:', updateError)
      return NextResponse.json(
        { error: 'Failed to update review' },
        { status: 500 }
      )
    }

    return NextResponse.json({ review })
  } catch (error) {
    console.error('Error in PUT /api/reviews/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete a review (soft delete - hide it)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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

    // Get existing review
    const { data: existingReview } = await (supabase as any)
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single() as { data: any }

    if (!existingReview) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // Check ownership
    if (existingReview.reviewer_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own reviews' },
        { status: 403 }
      )
    }

    // Soft delete by setting is_visible to false
    const { error: deleteError } = await (supabase as any)
      .from('reviews')
      .update({
        is_visible: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting review:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete review' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/reviews/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
