import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const listingSchema = z.object({
  type: z.enum(['room', 'shared_room', 'entire_place']),
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  description: z.string().max(2000).optional(),
  price: z.number().min(0, 'Price must be positive').max(50000),
  utilities_included: z.boolean().default(false),
  available_date: z.string(),
  minimum_stay: z.number().min(1).max(24).optional(),
  address: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  postal_code: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  photos: z.array(z.string()).default([]),
  amenities: z.array(z.string()).default([]),
  roommate_gender_preference: z.enum(['male', 'female', 'any']).optional(),
  roommate_age_min: z.number().min(18).optional(),
  roommate_age_max: z.number().max(120).optional(),
  newcomer_friendly: z.boolean().default(false),
  no_credit_history_ok: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const city = searchParams.get('city')
    const province = searchParams.get('province')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const type = searchParams.get('type')
    const newcomerFriendly = searchParams.get('newcomerFriendly')
    const noCreditOk = searchParams.get('noCreditOk')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '24')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = (supabase as any)
      .from('listings')
      .select(`
        *,
        profiles (
          id,
          user_id,
          name,
          profile_photo,
          verification_level
        )
      `)
      .order('created_at', { ascending: false })

    // If fetching user's own listings, show all (active + inactive)
    if (userId) {
      query = query.eq('user_id', userId)
    } else {
      query = query.eq('is_active', true)
    }

    if (city) {
      query = query.ilike('city', `%${city}%`)
    }
    if (province) {
      query = query.eq('province', province)
    }
    if (minPrice) {
      query = query.gte('price', parseInt(minPrice))
    }
    if (maxPrice) {
      query = query.lte('price', parseInt(maxPrice))
    }
    if (type) {
      query = query.eq('type', type)
    }
    if (newcomerFriendly === 'true') {
      query = query.eq('newcomer_friendly', true)
    }
    if (noCreditOk === 'true') {
      query = query.eq('no_credit_history_ok', true)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: listings, error } = await query as { data: any[] | null; error: any }

    if (error) {
      console.error('Error fetching listings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch listings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ listings })
  } catch (error) {
    console.error('Error in GET /api/listings:', error)
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

    // Validate input
    const validationResult = listingSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const listingData = validationResult.data

    // Create listing
    const { data: listing, error } = await (supabase as any)
      .from('listings')
      .insert({
        user_id: user.id,
        type: listingData.type,
        title: listingData.title,
        description: listingData.description || null,
        price: listingData.price,
        utilities_included: listingData.utilities_included,
        available_date: listingData.available_date,
        minimum_stay: listingData.minimum_stay || 1,
        address: listingData.address || null,
        city: listingData.city,
        province: listingData.province,
        postal_code: listingData.postal_code || null,
        lat: listingData.lat || null,
        lng: listingData.lng || null,
        photos: listingData.photos,
        amenities: listingData.amenities,
        roommate_gender_preference: listingData.roommate_gender_preference || null,
        roommate_age_min: listingData.roommate_age_min || null,
        roommate_age_max: listingData.roommate_age_max || null,
        newcomer_friendly: listingData.newcomer_friendly,
        no_credit_history_ok: listingData.no_credit_history_ok,
      })
      .select()
      .single() as { data: any; error: any }

    if (error) {
      console.error('Error creating listing:', error)
      return NextResponse.json(
        { error: 'Failed to create listing' },
        { status: 500 }
      )
    }

    return NextResponse.json({ listing }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/listings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
