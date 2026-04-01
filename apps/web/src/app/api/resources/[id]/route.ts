import { NextRequest } from 'next/server'
import { withPublicHandler, apiResponse, NotFoundError } from '@/lib/api/with-handler'

export const GET = withPublicHandler(
  async (req, { requestId, params }) => {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { id } = params

    // Try to find by slug first, then by ID
    let query = supabase
      .from('resources')
      .select(`
        *,
        category:resource_categories(id, slug, name, description)
      `)
      .eq('is_published', true)

    // Check if it's a UUID or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    if (isUUID) {
      query = query.eq('id', id)
    } else {
      query = query.eq('slug', id)
    }

    const { data: resource, error } = await query.single()

    if (error || !resource) {
      throw new NotFoundError('Resource not found')
    }

    // Increment view count (fire and forget)
    ;supabase
      .from('resources')
      .update({ view_count: resource.view_count + 1 })
      .eq('id', resource.id)
      .then(() => {})

    return apiResponse({ resource }, 200, requestId)
  },
  { rateLimit: 'search' }
)
