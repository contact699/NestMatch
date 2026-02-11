import { NextRequest } from 'next/server'
import { withAdminHandler, apiResponse, NotFoundError } from '@/lib/api/with-handler'

export const GET = withAdminHandler(
  async (req, { supabase, requestId, params }) => {
    const { id } = params

    const { data: faq, error: fetchError } = await supabase
      .from('faqs')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !faq) {
      throw new NotFoundError('FAQ not found')
    }

    return apiResponse({ faq }, 200, requestId)
  },
  { rateLimit: 'api' }
)

export const PUT = withAdminHandler(
  async (req, { supabase, requestId, params }) => {
    const { id } = params
    const body = await req.json()

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

    if (updateError) throw updateError

    return apiResponse({ faq }, 200, requestId)
  },
  {
    rateLimit: 'api',
    audit: {
      action: 'update',
      resourceType: 'faq',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)

export const DELETE = withAdminHandler(
  async (req, { supabase, requestId, params }) => {
    const { id } = params

    const { error: deleteError } = await supabase
      .from('faqs')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return apiResponse({ success: true }, 200, requestId)
  },
  {
    rateLimit: 'api',
    audit: {
      action: 'delete',
      resourceType: 'faq',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)
