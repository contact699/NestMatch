import { withApiHandler, apiResponse, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'

// Bump the calling member's last_read_at to NOW(). Used to clear unread
// indicators when the user opens the group page or returns to the tab.
export const POST = withApiHandler(
  async (_req, { userId, requestId, params }) => {
    const groupId = params?.id
    if (!groupId) throw new NotFoundError('Group')

    const service = (() => {
      try { return createServiceClient() } catch { return null }
    })()
    if (!service) {
      throw new Error('Service client unavailable')
    }

    const now = new Date().toISOString()
    const { error } = await service
      .from('co_renter_members')
      .update({ last_read_at: now })
      .eq('group_id', groupId)
      .eq('user_id', userId!)
      .eq('status', 'active')

    if (error) {
      logger.error(
        'mark-read failed',
        error instanceof Error ? error : new Error(String(error || 'unknown')),
        { requestId, groupId, userId: userId! },
      )
      return apiResponse({ error: 'Could not mark read' }, 500, requestId)
    }

    return apiResponse({ ok: true, last_read_at: now }, 200, requestId)
  },
  { rateLimit: 'api' },
)
