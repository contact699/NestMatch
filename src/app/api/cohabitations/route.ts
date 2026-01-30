import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createCohabitationSchema = z.object({
  listing_id: z.string().uuid(),
  seeker_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// Get cohabitations for the current user
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
    const status = searchParams.get('status') // 'active', 'completed', 'cancelled'
    const listingId = searchParams.get('listing_id')

    let query = (supabase as any)
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
      .or(`provider_id.eq.${user.id},seeker_id.eq.${user.id}`)

    if (status) {
      query = query.eq('status', status)
    }

    if (listingId) {
      query = query.eq('listing_id', listingId)
    }

    query = query.order('created_at', { ascending: false })

    const { data: cohabitations, error } = await query as { data: any[]; error: any }

    if (error) {
      console.error('Error fetching cohabitations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch cohabitations' },
        { status: 500 }
      )
    }

    // Add review status for each cohabitation
    const enrichedCohabitations = (cohabitations || []).map((cohab: any) => {
      const userHasReviewed = cohab.reviews?.some(
        (r: any) => r.reviewer_id === user.id
      )
      const canReview = !userHasReviewed && (
        cohab.status === 'completed' ||
        (cohab.status === 'active' && cohab.start_date && new Date(cohab.start_date) < new Date())
      )

      return {
        ...cohab,
        user_has_reviewed: userHasReviewed,
        can_review: canReview,
        is_provider: cohab.provider_id === user.id,
      }
    })

    return NextResponse.json({ cohabitations: enrichedCohabitations })
  } catch (error) {
    console.error('Error in GET /api/cohabitations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create a new cohabitation period (provider only)
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

    const validationResult = createCohabitationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { listing_id, seeker_id, start_date, end_date } = validationResult.data

    // Verify user owns the listing
    const { data: listing } = await (supabase as any)
      .from('listings')
      .select('user_id')
      .eq('id', listing_id)
      .single() as { data: any }

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    if (listing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the listing owner can create cohabitation records' },
        { status: 403 }
      )
    }

    // Verify seeker exists
    const { data: seeker } = await (supabase as any)
      .from('profiles')
      .select('user_id')
      .eq('user_id', seeker_id)
      .single() as { data: any }

    if (!seeker) {
      return NextResponse.json(
        { error: 'Seeker profile not found' },
        { status: 404 }
      )
    }

    // Check for existing active cohabitation with same seeker
    const { data: existingActive } = await (supabase as any)
      .from('cohabitation_periods')
      .select('id')
      .eq('listing_id', listing_id)
      .eq('seeker_id', seeker_id)
      .eq('status', 'active')
      .single() as { data: any }

    if (existingActive) {
      return NextResponse.json(
        { error: 'An active cohabitation already exists for this listing and seeker' },
        { status: 400 }
      )
    }

    // Create cohabitation
    const { data: cohabitation, error: insertError } = await (supabase as any)
      .from('cohabitation_periods')
      .insert({
        listing_id,
        provider_id: user.id,
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

    if (insertError) {
      console.error('Error creating cohabitation:', insertError)
      return NextResponse.json(
        { error: 'Failed to create cohabitation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ cohabitation }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/cohabitations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
