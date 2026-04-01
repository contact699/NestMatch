import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withPublicHandler, withApiHandler, apiResponse, parseBody, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const updateProviderSchema = z.object({
  business_name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  service_areas: z.array(z.string()).min(1).optional(),
  website_url: z.string().url().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  is_active: z.boolean().optional(),
})

// Get a specific service provider (public)
export const GET = withPublicHandler(
  async (req, { requestId, params }) => {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { id } = params

    const { data: provider, error } = await supabase
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
      throw new NotFoundError('Service provider not found')
    }

    // Calculate stats
    const ratings = provider.reviews?.map((r: any) => r.rating).filter(Boolean) || []
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length
      : null

    return apiResponse({
      provider: {
        ...provider,
        average_rating: averageRating,
        review_count: ratings.length,
      },
    }, 200, requestId)
  },
  { rateLimit: 'search' }
)

// Update a service provider (owner only)
export const PUT = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id } = params

    // Verify ownership
    const { data: existingProvider } = await supabase
      .from('service_providers')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existingProvider) {
      throw new NotFoundError('Service provider not found')
    }

    if (existingProvider.user_id !== userId!) {
      throw new AuthorizationError('You can only update your own provider profile')
    }

    // Validate input
    let body: z.infer<typeof updateProviderSchema>
    try {
      body = await parseBody(req, updateProviderSchema)
    } catch {
      throw new ValidationError('Invalid provider data')
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    const allowedFields = [
      'business_name', 'description', 'service_areas',
      'website_url', 'phone', 'is_active'
    ]

    for (const field of allowedFields) {
      if (body[field as keyof typeof body] !== undefined) {
        updateData[field] = body[field as keyof typeof body]
      }
    }

    const { data: provider, error: updateError } = await supabase
      .from('service_providers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return apiResponse({ provider }, 200, requestId)
  },
  {
    rateLimit: 'default',
    audit: {
      action: 'update',
      resourceType: 'service_provider',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)

// Soft-delete a service provider (owner only)
export const DELETE = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id } = params

    // Verify ownership
    const { data: existingProvider } = await supabase
      .from('service_providers')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existingProvider) {
      throw new NotFoundError('Service provider not found')
    }

    if (existingProvider.user_id !== userId!) {
      throw new AuthorizationError('You can only delete your own provider profile')
    }

    // Soft delete by setting is_active to false
    const { data: provider, error: deleteError } = await supabase
      .from('service_providers')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (deleteError) throw deleteError

    return apiResponse({ provider }, 200, requestId)
  },
  {
    rateLimit: 'default',
    audit: {
      action: 'delete',
      resourceType: 'service_provider',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)
