import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

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

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get the listing with profile info
    const { data: listing, error } = await (supabase as any)
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
      .single() as { data: any; error: any }

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Listing not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching listing:', error)
      return NextResponse.json(
        { error: 'Failed to fetch listing' },
        { status: 500 }
      )
    }

    // Increment view count (fire and forget)
    ;(supabase as any)
      .from('listings')
      .update({ views_count: (listing.views_count || 0) + 1 })
      .eq('id', id)
      .then(() => {})

    return NextResponse.json({ listing })
  } catch (error) {
    console.error('Error in GET /api/listings/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
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

    // Check if user owns this listing
    const { data: existingListing, error: fetchError } = await (supabase as any)
      .from('listings')
      .select('user_id')
      .eq('id', id)
      .single() as { data: any; error: any }

    if (fetchError || !existingListing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    if (existingListing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate input
    const validationResult = updateListingSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    // Update listing
    const { data: listing, error } = await (supabase as any)
      .from('listings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single() as { data: any; error: any }

    if (error) {
      console.error('Error updating listing:', error)
      return NextResponse.json(
        { error: 'Failed to update listing' },
        { status: 500 }
      )
    }

    return NextResponse.json({ listing })
  } catch (error) {
    console.error('Error in PUT /api/listings/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
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

    // Check if user owns this listing
    const { data: existingListing, error: fetchError } = await (supabase as any)
      .from('listings')
      .select('user_id')
      .eq('id', id)
      .single() as { data: any; error: any }

    if (fetchError || !existingListing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    if (existingListing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Delete listing
    const { error } = await (supabase as any)
      .from('listings')
      .delete()
      .eq('id', id) as { error: any }

    if (error) {
      console.error('Error deleting listing:', error)
      return NextResponse.json(
        { error: 'Failed to delete listing' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/listings/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
