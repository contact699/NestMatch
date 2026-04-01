import { NextRequest } from 'next/server'
import { withAdminHandler, apiResponse } from '@/lib/api/with-handler'

export const GET = withAdminHandler(
  async (_req, { supabase, requestId }) => {
    const { data: categories, error } = await supabase
      .from('resource_categories')
      .select('*')
      .order('display_order')

    if (error) throw error

    return apiResponse({ categories }, 200, requestId)
  },
  { rateLimit: 'api' }
)

export const POST = withAdminHandler(
  async (req, { supabase, requestId }) => {
    const body = await req.json()

    const { data: category, error } = await supabase
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

    if (error) throw error

    return apiResponse({ category }, 201, requestId)
  },
  {
    rateLimit: 'api',
    audit: {
      action: 'create',
      resourceType: 'resource_category',
      getResourceId: (_req, res) => res?.category?.id,
    },
  }
)
