import { NextRequest } from 'next/server'
import { withApiHandler, apiResponse } from '@/lib/api/with-handler'

export const DELETE = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id } = params
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')

    let query = (supabase as any)
      .from('resource_bookmarks')
      .delete()
      .eq('user_id', userId)

    if (type === 'resource') {
      query = query.eq('resource_id', id)
    } else if (type === 'faq') {
      query = query.eq('faq_id', id)
    } else {
      // Try to delete by bookmark ID
      query = query.eq('id', id)
    }

    const { error } = await query

    if (error) throw error

    return apiResponse({ success: true }, 200, requestId)
  }
)
