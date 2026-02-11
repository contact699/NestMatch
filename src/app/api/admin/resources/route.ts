import { NextRequest } from 'next/server'
import { withAdminHandler, apiResponse } from '@/lib/api/with-handler'

export const GET = withAdminHandler(
  async (_req, { supabase, requestId }) => {
    const { data: resources, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return apiResponse({ resources }, 200, requestId)
  },
  { rateLimit: 'api' }
)

export const POST = withAdminHandler(
  async (req, { supabase, requestId }) => {
    const body = await req.json()

    const { data: resource, error } = await supabase
      .from('resources')
      .insert({
        title: body.title,
        slug: body.slug,
        subtitle: body.subtitle || null,
        excerpt: body.excerpt || null,
        content: body.content || [],
        category_id: body.category_id || null,
        resource_type: body.resource_type || 'guide',
        provinces: body.provinces || [],
        tags: body.tags || [],
        is_published: body.is_published ?? false,
        featured: body.featured ?? false,
      })
      .select()
      .single()

    if (error) throw error

    return apiResponse({ resource }, 201, requestId)
  },
  {
    rateLimit: 'api',
    audit: {
      action: 'create',
      resourceType: 'resource',
      getResourceId: (_req, res) => res?.resource?.id,
    },
  }
)
