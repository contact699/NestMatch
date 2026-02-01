import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { data: faq, error: fetchError } = await supabase
    .from('faqs')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !faq) {
    return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
  }

  return NextResponse.json({ faq })
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

    const { data: faq, error: updateError } = await supabase
      .from('faqs')
      .update({
        question: body.question,
        answer: body.answer,
        category_id: body.category_id || null,
        provinces: body.provinces || [],
        tags: body.tags || [],
        display_order: body.display_order,
        is_published: body.is_published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update FAQ' }, { status: 500 })
    }

    return NextResponse.json({ faq })
  } catch (error) {
    console.error('Error updating FAQ:', error)
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
    .from('faqs')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete FAQ' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
