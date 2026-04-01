import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'
import { sendEmail } from '@/lib/email'
import { questionReceivedEmail } from '@/lib/email-templates'
import { logger } from '@/lib/logger'

const questionSchema = z.object({
  question: z.string().min(10, 'Question must be at least 10 characters').max(500),
  context: z.string().max(1000).optional(),
  province: z.string().optional(),
  categoryId: z.string().uuid().optional(),
})

export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Validate input
    let body: z.infer<typeof questionSchema>
    try {
      body = await parseBody(req, questionSchema)
    } catch {
      throw new ValidationError('Invalid question data')
    }

    const { question, context, province, categoryId } = body

    const { data: submittedQuestion, error } = await supabase
      .from('submitted_questions')
      .insert({
        user_id: userId!,
        question,
        context: context || null,
        province: province || null,
        category_id: categoryId || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    // Send confirmation email if user has email (fire and forget)
    const { data: userData } = await supabase.auth.getUser()
    if (userData?.user?.email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', userId!)
        .single()

      const emailContent = questionReceivedEmail({
        userName: (profile as { name?: string })?.name || 'there',
        question: body.question,
      })

      // Fire and forget - don't await to avoid blocking response
      sendEmail({
        to: userData.user.email,
        ...emailContent,
      }).catch((err) => logger.error('Error sending confirmation email', err instanceof Error ? err : new Error(String(err))))
    }

    return apiResponse({ question: submittedQuestion }, 201, requestId)
  },
  { rateLimit: 'default' }
)

export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const { data: questions, error } = await supabase
      .from('submitted_questions')
      .select(`
        *,
        category:resource_categories(id, name),
        answered_faq:faqs(id, question, answer)
      `)
      .eq('user_id', userId!)
      .order('created_at', { ascending: false })

    if (error) throw error

    return apiResponse({ questions }, 200, requestId)
  },
  { rateLimit: 'default' }
)
