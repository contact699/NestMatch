import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

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

    if (error) {
      console.error('Error fetching FAQs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch FAQs' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      faqs,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in GET /api/resources/faqs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
