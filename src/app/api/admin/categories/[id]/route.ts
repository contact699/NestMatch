import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { data: category, error: fetchError } = await supabase
    .from('resource_categories')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  return NextResponse.json({ category })
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

    const { data: category, error: updateError } = await supabase
      .from('resource_categories')
      .update({
        name: body.name,
        slug: body.slug,
        description: body.description || null,
        icon: body.icon || null,
        display_order: body.display_order,
        is_active: body.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error updating category:', error)
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
    .from('resource_categories')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
