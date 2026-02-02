import { NextRequest } from 'next/server'
import { withPublicHandler, apiResponse } from '@/lib/api/with-handler'

export const GET = withPublicHandler(
  async (req, { requestId }) => {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data: categories, error } = await (supabase as any)
      .from('resource_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) throw error

    return apiResponse({ categories }, 200, requestId)
  }
)
