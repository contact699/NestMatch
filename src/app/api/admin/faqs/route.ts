import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'

export async function GET() {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { data: faqs, error: fetchError } = await supabase
    .from('faqs')
    .select('*')
    .order('display_order')

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch FAQs' }, { status: 500 })
  }

  return NextResponse.json({ faqs })
}

export async function POST(request: NextRequest) {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()

    const { data: faq, error: insertError } = await supabase
      .from('faqs')
      .insert({
        question: body.question,
        answer: body.answer,
        category_id: body.category_id || null,
        provinces: body.provinces || [],
        tags: body.tags || [],
        display_order: body.display_order ?? 0,
        is_published: body.is_published ?? false,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create FAQ' }, { status: 500 })
    }

    return NextResponse.json({ faq }, { status: 201 })
  } catch (error) {
    console.error('Error creating FAQ:', error)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
