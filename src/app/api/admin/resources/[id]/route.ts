import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { data: resource, error: fetchError } = await supabase
    .from('resources')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !resource) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
  }

  return NextResponse.json({ resource })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()

    const { data: resource, error: updateError } = await supabase
      .from('resources')
      .update({
        title: body.title,
        slug: body.slug,
        subtitle: body.subtitle || null,
        excerpt: body.excerpt || null,
        content: body.content || [],
        category_id: body.category_id || null,
        resource_type: body.resource_type,
        provinces: body.provinces || [],
        tags: body.tags || [],
        is_published: body.is_published,
        featured: body.featured,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 })
    }

    return NextResponse.json({ resource })
  } catch (error) {
    console.error('Error updating resource:', error)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { error: deleteError } = await supabase
    .from('resources')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
