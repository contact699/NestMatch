import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

export async function GET() {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { data: categories, error: fetchError } = await supabase
    .from('resource_categories')
    .select('*')
    .order('display_order')

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }

  return NextResponse.json({ categories })
}

export async function POST(request: NextRequest) {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()

    const { data: category, error: insertError } = await supabase
      .from('resource_categories')
      .insert({
        name: body.name,
        slug: body.slug,
        description: body.description || null,
        icon: body.icon || null,
        display_order: body.display_order ?? 0,
        is_active: body.is_active ?? true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
