import { NextRequest } from 'next/server'
import { withAdminHandler, apiResponse, NotFoundError } from '@/lib/api/with-handler'

export const GET = withAdminHandler(
  async (req, { supabase, requestId, params }) => {
    const { id } = params

    const { data: category, error: fetchError } = await supabase
      .from('resource_categories')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !category) {
      throw new NotFoundError('Category not found')
    }

    return apiResponse({ category }, 200, requestId)
  },
  { rateLimit: 'api' }
)

export const PUT = withAdminHandler(
  async (req, { supabase, requestId, params }) => {
    const { id } = params
    const body = await req.json()

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

    if (updateError) throw updateError

    return apiResponse({ category }, 200, requestId)
  },
  {
    rateLimit: 'api',
    audit: {
      action: 'update',
      resourceType: 'resource_category',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)

export const DELETE = withAdminHandler(
  async (req, { supabase, requestId, params }) => {
    const { id } = params

    const { error: deleteError } = await supabase
      .from('resource_categories')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return apiResponse({ success: true }, 200, requestId)
  },
  {
    rateLimit: 'api',
    audit: {
      action: 'delete',
      resourceType: 'resource_category',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)
