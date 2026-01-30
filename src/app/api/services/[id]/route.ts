import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateProviderSchema = z.object({
  business_name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  service_areas: z.array(z.string()).min(1).optional(),
  website_url: z.string().url().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  is_active: z.boolean().optional(),
})

// Get a specific service provider
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: provider, error } = await (supabase as any)
      .from('service_providers')
      .select(`
        *,
        user:profiles(
          user_id,
          name,
          profile_photo,
          bio
        ),
        reviews:service_reviews(
          id,
          rating,
          comment,
          created_at,
          customer:profiles(
            user_id,
            name,
            profile_photo
          )
        )
      `)
      .eq('id', id)
      .single() as { data: any; error: any }

    if (error || !provider) {
      return NextResponse.json(
        { error: 'Service provider not found' },
        { status: 404 }
      )
    }

    // Calculate stats
    const ratings = provider.reviews?.map((r: any) => r.rating).filter(Boolean) || []
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length
      : null

    return NextResponse.json({
      provider: {
        ...provider,
        average_rating: averageRating,
        review_count: ratings.length,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/services/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update a service provider (owner only)
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

    // Verify ownership
    const { data: existingProvider } = await (supabase as any)
      .from('service_providers')
      .select('user_id')
      .eq('id', id)
      .single() as { data: any }

    if (!existingProvider) {
      return NextResponse.json(
        { error: 'Service provider not found' },
        { status: 404 }
      )
    }

    if (existingProvider.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only update your own provider profile' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = updateProviderSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    const allowedFields = [
      'business_name', 'description', 'service_areas',
      'website_url', 'phone', 'is_active'
    ]

    for (const field of allowedFields) {
      if (validationResult.data[field as keyof typeof validationResult.data] !== undefined) {
        updateData[field] = validationResult.data[field as keyof typeof validationResult.data]
      }
    }

    const { data: provider, error: updateError } = await (supabase as any)
      .from('service_providers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating provider:', updateError)
      return NextResponse.json(
        { error: 'Failed to update provider' },
        { status: 500 }
      )
    }

    return NextResponse.json({ provider })
  } catch (error) {
    console.error('Error in PUT /api/services/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
