import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { sendEmail } from '@/lib/email'
import { questionAnsweredEmail } from '@/lib/email-templates'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { data: question, error: fetchError } = await supabase
    .from('submitted_questions')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  return NextResponse.json({ question })
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

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.status !== undefined) {
      updateData.status = body.status
    }
    if (body.admin_notes !== undefined) {
      updateData.admin_notes = body.admin_notes
    }
    if (body.answered_faq_id !== undefined) {
      updateData.answered_faq_id = body.answered_faq_id
    }
    if (body.category_id !== undefined) {
      updateData.category_id = body.category_id
    }

    const { data: question, error: updateError } = await supabase
      .from('submitted_questions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update question' }, { status: 500 })
    }

    return NextResponse.json({ question })
  } catch (error) {
    console.error('Error updating question:', error)
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
    .from('submitted_questions')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const body = await request.json()

  // Get current question with user info
  const { data: question } = await supabase
    .from('submitted_questions')
    .select('*, profiles:user_id(name, email)')
    .eq('id', id)
    .single()

  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  // Update question
  const { data, error: updateError } = await supabase
    .from('submitted_questions')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Send email if status changed to 'answered' and we have answered_faq_id
  if (body.status === 'answered' && body.answered_faq_id && question.profiles?.email) {
    const faqUrl = `${process.env.NEXT_PUBLIC_APP_URL}/resources/faq#${body.answered_faq_id}`
    const emailContent = questionAnsweredEmail({
      userName: question.profiles.name || 'there',
      question: question.question,
      faqUrl,
    })

    sendEmail({
      to: question.profiles.email,
      ...emailContent,
    }).catch(err => console.error('Error sending answered email:', err))
  }

  return NextResponse.json(data)
}
