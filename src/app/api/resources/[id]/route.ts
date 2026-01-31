import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Try to find by slug first, then by ID
    let query = (supabase as any)
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
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      )
    }

    // Increment view count (fire and forget)
    ;(supabase as any)
      .from('resources')
      .update({ view_count: resource.view_count + 1 })
      .eq('id', resource.id)
      .then(() => {})

    return NextResponse.json({ resource })
  } catch (error) {
    console.error('Error in GET /api/resources/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
