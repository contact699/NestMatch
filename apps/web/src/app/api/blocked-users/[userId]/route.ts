import { NextRequest } from 'next/server'
import { withApiHandler, apiResponse } from '@/lib/api/with-handler'

export const DELETE = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const blockedUserId = params.userId

    // Unblock user
    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('user_id', userId!)
      .eq('blocked_user_id', blockedUserId)

    if (error) throw error

    return apiResponse({ success: true }, 200, requestId)
  },
  {
    rateLimit: 'default',
    audit: {
      action: 'delete',
      resourceType: 'blocked_user',
    },
  }
)
