import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { sendEmail } from '@/lib/email'
import { questionReceivedEmail } from '@/lib/email-templates'

const questionSchema = z.object({
  question: z.string().min(10, 'Question must be at least 10 characters').max(500),
  context: z.string().max(1000).optional(),
  province: z.string().optional(),
  categoryId: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validationResult = questionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { question, context, province, categoryId } = validationResult.data

    const { data: submittedQuestion, error } = await (supabase as any)
      .from('submitted_questions')
      .insert({
        user_id: user.id,
        question,
        context: context || null,
        province: province || null,
        category_id: categoryId || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error submitting question:', error)
      return NextResponse.json(
        { error: 'Failed to submit question' },
        { status: 500 }
      )
    }

    // Send confirmation email if user has email (fire and forget)
    if (user?.email) {
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single()

      const emailContent = questionReceivedEmail({
        userName: (profile as { name?: string })?.name || 'there',
        question: body.question,
      })

      // Fire and forget - don't await to avoid blocking response
      sendEmail({
        to: user.email,
        ...emailContent,
      }).catch((err) => console.error('Error sending confirmation email:', err))
    }

    return NextResponse.json({ question: submittedQuestion }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/resources/questions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: questions, error } = await (supabase as any)
      .from('submitted_questions')
      .select(`
        *,
        category:resource_categories(id, name),
        answered_faq:faqs(id, question, answer)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching questions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Error in GET /api/resources/questions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
