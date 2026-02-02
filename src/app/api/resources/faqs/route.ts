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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const now = new Date().toISOString()

    let query = (supabase as any)
      .from('faqs')
      .select(`
        *,
        category:resource_categories(id, slug, name)
      `)
      .eq('is_published', true)
      .or(`publish_at.is.null,publish_at.lte.${now}`)
      .or(`unpublish_at.is.null,unpublish_at.gt.${now}`)
      .order('display_order', { ascending: true })
      .order('helpful_count', { ascending: false })

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
      // Get FAQs that either have this province or are applicable to all (empty array)
      query = query.or(`provinces.cs.{${province}},provinces.eq.{}`)
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: faqs, error, count } = await query

    if (error) throw error

    return apiResponse({
      faqs,
      total: count,
      limit,
      offset,
    }, 200, requestId)
  },
  { rateLimit: 'search' }
)
