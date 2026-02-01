import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

export async function GET() {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { data: resources, error: fetchError } = await supabase
    .from('resources')
    .select('*')
    .order('created_at', { ascending: false })

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 })
  }

  return NextResponse.json({ resources })
}

export async function POST(request: NextRequest) {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()

    const { data: resource, error: insertError } = await supabase
      .from('resources')
      .insert({
        title: body.title,
        slug: body.slug,
        subtitle: body.subtitle || null,
        excerpt: body.excerpt || null,
        content: body.content || [],
        category_id: body.category_id || null,
        resource_type: body.resource_type || 'guide',
        provinces: body.provinces || [],
        tags: body.tags || [],
        is_published: body.is_published ?? false,
        featured: body.featured ?? false,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 })
    }

    return NextResponse.json({ resource }, { status: 201 })
  } catch (error) {
    console.error('Error creating resource:', error)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
