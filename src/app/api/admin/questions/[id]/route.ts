import { NextRequest } from 'next/server'
import { withAdminHandler, apiResponse, NotFoundError } from '@/lib/api/with-handler'
import { sendEmail } from '@/lib/email'
import { questionAnsweredEmail } from '@/lib/email-templates'
import { logger } from '@/lib/logger'

export const GET = withAdminHandler(
  async (req, { supabase, requestId, params }) => {
    const { id } = params

    const { data: question, error: fetchError } = await supabase
      .from('submitted_questions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !question) {
      throw new NotFoundError('Question not found')
    }

    return apiResponse({ question }, 200, requestId)
  },
  { rateLimit: 'api' }
)

export const PUT = withAdminHandler(
  async (req, { supabase, requestId, params }) => {
    const { id } = params
    const body = await req.json()

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

    if (updateError) throw updateError

    return apiResponse({ question }, 200, requestId)
  },
  {
    rateLimit: 'api',
    audit: {
      action: 'update',
      resourceType: 'submitted_question',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)

export const DELETE = withAdminHandler(
  async (req, { supabase, requestId, params }) => {
    const { id } = params

    const { error: deleteError } = await supabase
      .from('submitted_questions')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return apiResponse({ success: true }, 200, requestId)
  },
  {
    rateLimit: 'api',
    audit: {
      action: 'delete',
      resourceType: 'submitted_question',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)

export const PATCH = withAdminHandler(
  async (req, { supabase, requestId, params }) => {
    const { id } = params
    const body = await req.json()

    // Get current question with user info
    const { data: question } = await supabase
      .from('submitted_questions')
      .select('*, profiles:user_id(name, email)')
      .eq('id', id)
      .single()

    if (!question) {
      throw new NotFoundError('Question not found')
    }

    // Update question
    const { data, error: updateError } = await supabase
      .from('submitted_questions')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Send email if status changed to 'answered' and we have answered_faq_id
    if (body.status === 'answered' && body.answered_faq_id && (question as any).profiles?.email) {
      const faqUrl = `${process.env.NEXT_PUBLIC_APP_URL}/resources/faq#${body.answered_faq_id}`
      const emailContent = questionAnsweredEmail({
        userName: (question as any).profiles.name || 'there',
        question: (question as any).question,
        faqUrl,
      })

      sendEmail({
        to: (question as any).profiles.email,
        ...emailContent,
      }).catch(err => logger.error('Error sending answered email', err instanceof Error ? err : new Error(String(err))))
    }

    return apiResponse(data, 200, requestId)
  },
  {
    rateLimit: 'api',
    audit: {
      action: 'update',
      resourceType: 'submitted_question',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)
