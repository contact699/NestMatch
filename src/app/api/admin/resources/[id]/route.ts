import { NextRequest } from 'next/server'
import { withAdminHandler, apiResponse, NotFoundError } from '@/lib/api/with-handler'

export const GET = withAdminHandler(
  async (req, { supabase, requestId, params }) => {
    const { id } = params

    const { data: resource, error: fetchError } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !resource) {
      throw new NotFoundError('Resource not found')
    }

    return apiResponse({ resource }, 200, requestId)
  }
)

export const PUT = withAdminHandler(
  async (req, { supabase, requestId, params }) => {
    const { id } = params
    const body = await req.json()

    const { data: resource, error: updateError } = await supabase
      .from('resources')
      .update({
        title: body.title,
        slug: body.slug,
        subtitle: body.subtitle || null,
        excerpt: body.excerpt || null,
        content: body.content || [],
        category_id: body.category_id || null,
        resource_type: body.resource_type,
        provinces: body.provinces || [],
        tags: body.tags || [],
        is_published: body.is_published,
        featured: body.featured,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return apiResponse({ resource }, 200, requestId)
  },
  {
    audit: {
      action: 'update',
      resourceType: 'resource',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)

export const DELETE = withAdminHandler(
  async (req, { supabase, requestId, params }) => {
    const { id } = params

    const { error: deleteError } = await supabase
      .from('resources')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return apiResponse({ success: true }, 200, requestId)
  },
  {
    audit: {
      action: 'delete',
      resourceType: 'resource',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)
