import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { createServiceClient } from '@/lib/supabase/service'

const markReadSchema = z.union([
  z.object({
    notification_ids: z.array(z.string().uuid()).min(1),
  }),
  z.object({
    mark_all_read: z.literal(true),
  }),
])

// Fetch the current user's notifications (most recent 50) + unread count.
export const GET = withApiHandler(
  async (_req, { userId, supabase, requestId }) => {
    const svcClient = (() => {
      try { return createServiceClient() } catch { return supabase }
    })()

    const { data: notifications, error: fetchError } = await svcClient
      .from('notifications')
      .select('*')
      .eq('user_id', userId!)
      .order('created_at', { ascending: false })
      .limit(50)

    if (fetchError) throw fetchError

    const { count: unread_count, error: countError } = await svcClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId!)
      .is('read_at', null)

    if (countError) throw countError

    return apiResponse({ notifications, unread_count: unread_count ?? 0 }, 200, requestId)
  },
  { rateLimit: 'default' }
)

// Mark notifications as read — either a specific set of ids or all of them.
export const PUT = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const svcClient = (() => {
      try { return createServiceClient() } catch { return supabase }
    })()

    const body = await parseBody(req, markReadSchema)

    const now = new Date().toISOString()

    if ('mark_all_read' in body) {
      const { error: updateError } = await svcClient
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', userId!)
        .is('read_at', null)

      if (updateError) throw updateError
    } else {
      // Scope to the user's own notifications so ids from other users are no-ops.
      const { error: updateError } = await svcClient
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', userId!)
        .in('id', body.notification_ids)

      if (updateError) throw updateError
    }

    return apiResponse({ success: true }, 200, requestId)
  },
  { rateLimit: 'default' }
)
