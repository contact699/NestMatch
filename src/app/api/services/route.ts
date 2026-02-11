import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, withPublicHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const createProviderSchema = z.object({
  business_name: z.string().min(1).max(255),
  service_type: z.enum(['moving', 'cleaning', 'storage', 'handyman', 'other']),
  description: z.string().max(2000).optional(),
  service_areas: z.array(z.string()).min(1),
  website_url: z.string().url().optional(),
  phone: z.string().max(20).optional(),
})

// Get service providers (public)
export const GET = withPublicHandler(
  async (req, { requestId }) => {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { searchParams } = new URL(req.url)
    const serviceType = searchParams.get('type')
    const city = searchParams.get('city')
    const verified = searchParams.get('verified')

    let query = supabase
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

    const { data: providers, error } = await query

    if (error) throw error

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

    return apiResponse({ providers: enrichedProviders }, 200, requestId)
  },
  { rateLimit: 'search' }
)

// Register as a service provider
export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Validate input
    let body: z.infer<typeof createProviderSchema>
    try {
      body = await parseBody(req, createProviderSchema)
    } catch {
      throw new ValidationError('Invalid provider data')
    }

    const {
      business_name,
      service_type,
      description,
      service_areas,
      website_url,
      phone,
    } = body

    // Check if user already has a provider profile
    const { data: existingProvider } = await supabase
      .from('service_providers')
      .select('id')
      .eq('user_id', userId!)
      .single()

    if (existingProvider) {
      return apiResponse(
        { error: 'You already have a service provider profile' },
        400,
        requestId
      )
    }

    // Create provider
    const { data: provider, error: createError } = await supabase
      .from('service_providers')
      .insert({
        user_id: userId!,
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

    if (createError) throw createError

    return apiResponse({ provider }, 201, requestId)
  },
  {
    rateLimit: 'default',
    audit: {
      action: 'create',
      resourceType: 'service_provider',
      getResourceId: (_req, res) => res?.provider?.id,
    },
  }
)
