import { NextRequest } from 'next/server'
import { withAdminHandler, apiResponse } from '@/lib/api/with-handler'

export const GET = withAdminHandler(
  async (_req, { supabase, requestId }) => {
    const { data: faqs, error } = await supabase
      .from('faqs')
      .select('*')
      .order('display_order')

    if (error) throw error

    return apiResponse({ faqs }, 200, requestId)
  },
  { rateLimit: 'api' }
)

export const POST = withAdminHandler(
  async (req, { supabase, requestId }) => {
    const body = await req.json()

    const { data: faq, error } = await supabase
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

    if (error) throw error

    return apiResponse({ faq }, 201, requestId)
  },
  {
    rateLimit: 'api',
    audit: {
      action: 'create',
      resourceType: 'faq',
      getResourceId: (_req, res) => res?.faq?.id,
    },
  }
)
