import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createProviderSchema = z.object({
  business_name: z.string().min(1).max(255),
  service_type: z.enum(['moving', 'cleaning', 'storage', 'handyman', 'other']),
  description: z.string().max(2000).optional(),
  service_areas: z.array(z.string()).min(1),
  website_url: z.string().url().optional(),
  phone: z.string().max(20).optional(),
})

// Get service providers
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const serviceType = searchParams.get('type')
    const city = searchParams.get('city')
    const verified = searchParams.get('verified')

    let query = (supabase as any)
      .from('service_providers')
      .select(`
        *,
        user:profiles(
          user_id,
          name,
          profile_photo
        ),
        bookings:service_bookings(count),
        reviews:service_reviews(
          rating
        )
      `)
      .eq('is_active', true)

    if (serviceType) {
      query = query.eq('service_type', serviceType)
    }

    if (city) {
      query = query.contains('service_areas', [city])
    }

    if (verified === 'true') {
      query = query.eq('is_verified', true)
    }

    query = query.order('is_verified', { ascending: false })
      .order('created_at', { ascending: false })

    const { data: providers, error } = await query as { data: any[]; error: any }

    if (error) {
      console.error('Error fetching providers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch service providers' },
        { status: 500 }
      )
    }

    // Calculate average ratings
    const enrichedProviders = (providers || []).map((provider: any) => {
      const ratings = provider.reviews?.map((r: any) => r.rating).filter(Boolean) || []
      const averageRating = ratings.length > 0
        ? ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length
        : null

      return {
        ...provider,
        average_rating: averageRating,
        review_count: ratings.length,
        booking_count: provider.bookings?.[0]?.count || 0,
      }
    })

    return NextResponse.json({ providers: enrichedProviders })
  } catch (error) {
    console.error('Error in GET /api/services:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Register as a service provider
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

    const validationResult = createProviderSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const {
      business_name,
      service_type,
      description,
      service_areas,
      website_url,
      phone,
    } = validationResult.data

    // Check if user already has a provider profile
    const { data: existingProvider } = await (supabase as any)
      .from('service_providers')
      .select('id')
      .eq('user_id', user.id)
      .single() as { data: any }

    if (existingProvider) {
      return NextResponse.json(
        { error: 'You already have a service provider profile' },
        { status: 400 }
      )
    }

    // Create provider
    const { data: provider, error: createError } = await (supabase as any)
      .from('service_providers')
      .insert({
        user_id: user.id,
        business_name,
        service_type,
        description,
        service_areas,
        website_url,
        phone,
        is_verified: false,
        is_active: true,
      })
      .select(`
        *,
        user:profiles(
          name,
          profile_photo
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating provider:', createError)
      return NextResponse.json(
        { error: 'Failed to create service provider' },
        { status: 500 }
      )
    }

    return NextResponse.json({ provider }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/services:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
