import { NextRequest } from 'next/server'
import { withPublicHandler, apiResponse } from '@/lib/api/with-handler'

export const GET = withPublicHandler(
  async (req, { requestId }) => {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { searchParams } = new URL(req.url)

    const search = searchParams.get('q')
    const category = searchParams.get('category')
    const province = searchParams.get('province')
    const type = searchParams.get('type')
    const featured = searchParams.get('featured')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const now = new Date().toISOString()

    let query = (supabase as any)
      .from('resources')
      .select(`
        *,
        category:resource_categories(id, slug, name)
      `)
      .eq('is_published', true)
      .or(`publish_at.is.null,publish_at.lte.${now}`)
      .or(`unpublish_at.is.null,unpublish_at.gt.${now}`)
      .order('created_at', { ascending: false })

    // Full-text search
    if (search) {
      query = query.textSearch('search_vector', search, {
        type: 'websearch',
        config: 'english',
      })
    }

    // Filter by category slug
    if (category) {
      const { data: categoryData } = await (supabase as any)
        .from('resource_categories')
        .select('id')
        .eq('slug', category)
        .single()

      if (categoryData) {
        query = query.eq('category_id', categoryData.id)
      }
    }

    // Filter by province
    if (province) {
      query = query.contains('provinces', [province])
    }

    // Filter by resource type
    if (type) {
      query = query.eq('resource_type', type)
    }

    // Filter featured only
    if (featured === 'true') {
      query = query.eq('featured', true)
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: resources, error, count } = await query

    if (error) throw error

    return apiResponse({
      resources,
      total: count,
      limit,
      offset,
    }, 200, requestId)
  },
  { rateLimit: 'search' }
)
