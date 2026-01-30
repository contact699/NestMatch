import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
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

    // Get saved listings with full listing data
    const { data: savedListings, error } = await (supabase as any)
      .from('saved_listings')
      .select(`
        id,
        created_at,
        listings (
          *,
          profiles (
            id,
            user_id,
            name,
            profile_photo,
            verification_level
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }) as { data: any[] | null; error: any }

    if (error) {
      console.error('Error fetching saved listings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch saved listings' },
        { status: 500 }
      )
    }

    // Transform the data to include listing directly
    const listings = (savedListings || [])
      .filter((s) => s.listings !== null)
      .map((s) => ({
        ...s.listings,
        saved_at: s.created_at,
        saved_id: s.id,
      }))

    return NextResponse.json({ listings })
  } catch (error) {
    console.error('Error in GET /api/saved-listings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { listing_id } = body

    if (!listing_id) {
      return NextResponse.json(
        { error: 'listing_id is required' },
        { status: 400 }
      )
    }

    // Check if listing exists
    const { data: listing, error: listingError } = await (supabase as any)
      .from('listings')
      .select('id')
      .eq('id', listing_id)
      .single() as { data: any; error: any }

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    // Check if already saved
    const { data: existing } = await (supabase as any)
      .from('saved_listings')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', listing_id)
      .single() as { data: any; error: any }

    if (existing) {
      return NextResponse.json(
        { error: 'Listing already saved' },
        { status: 409 }
      )
    }

    // Save listing
    const { data: saved, error } = await (supabase as any)
      .from('saved_listings')
      .insert({
        user_id: user.id,
        listing_id,
      })
      .select()
      .single() as { data: any; error: any }

    if (error) {
      console.error('Error saving listing:', error)
      return NextResponse.json(
        { error: 'Failed to save listing' },
        { status: 500 }
      )
    }

    return NextResponse.json({ saved }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/saved-listings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
