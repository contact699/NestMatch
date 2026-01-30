import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateCohabitationSchema = z.object({
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
})

// Get a specific cohabitation
export async function GET(request: NextRequest, { params }: RouteParams) {
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
      .single() as { data: any; error: any }

    if (error || !cohabitation) {
      return NextResponse.json(
        { error: 'Cohabitation not found' },
        { status: 404 }
      )
    }

    // Verify user is a participant
    if (cohabitation.provider_id !== user.id && cohabitation.seeker_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Add review status
    const userHasReviewed = cohabitation.reviews?.some(
      (r: any) => r.reviewer_id === user.id
    )
    const canReview = !userHasReviewed && (
      cohabitation.status === 'completed' ||
      (cohabitation.status === 'active' && cohabitation.start_date && new Date(cohabitation.start_date) < new Date())
    )

    return NextResponse.json({
      cohabitation: {
        ...cohabitation,
        user_has_reviewed: userHasReviewed,
        can_review: canReview,
        is_provider: cohabitation.provider_id === user.id,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/cohabitations/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update a cohabitation (provider only)
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

    // Get existing cohabitation
    const { data: existingCohabitation } = await (supabase as any)
      .from('cohabitation_periods')
      .select('*')
      .eq('id', id)
      .single() as { data: any }

    if (!existingCohabitation) {
      return NextResponse.json(
        { error: 'Cohabitation not found' },
        { status: 404 }
      )
    }

    // Only provider can update
    if (existingCohabitation.provider_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the provider can update the cohabitation' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = updateCohabitationSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (validationResult.data.end_date !== undefined) {
      updateData.end_date = validationResult.data.end_date
    }

    if (validationResult.data.status !== undefined) {
      updateData.status = validationResult.data.status
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

    if (updateError) {
      console.error('Error updating cohabitation:', updateError)
      return NextResponse.json(
        { error: 'Failed to update cohabitation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ cohabitation })
  } catch (error) {
    console.error('Error in PUT /api/cohabitations/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
