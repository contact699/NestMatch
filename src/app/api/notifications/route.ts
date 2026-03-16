import { NextRequest } from 'next/server'
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

// Fetch user's notifications
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const svcClient = (() => {
      try { return createServiceClient() } catch { return supabase }
    })()

    // Fetch notifications ordered by most recent, limit 50
    const { data: notifications, error: fetchError } = await (svcClient as any)
      .from('notifications')
      .select('*')
      .eq('user_id', userId!)
      .order('created_at', { ascending: false })
      .limit(50)

    if (fetchError) throw fetchError

    // Count unread notifications
    const { count: unread_count, error: countError } = await (svcClient as any)
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId!)
      .is('read_at', null)

    if (countError) throw countError

    return apiResponse({ notifications, unread_count: unread_count ?? 0 }, 200, requestId)
  },
  { rateLimit: 'default' }
)

// Mark notifications as read
export const PUT = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const svcClient = (() => {
      try { return createServiceClient() } catch { return supabase }
    })()

    const body = await parseBody(req, markReadSchema)

    const now = new Date().toISOString()

    if ('mark_all_read' in body) {
      // Mark all user's notifications as read
      const { error: updateError } = await (svcClient as any)
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', userId!)
        .is('read_at', null)

      if (updateError) throw updateError
    } else {
      // Mark specific notifications as read (only user's own)
      const { error: updateError } = await (svcClient as any)
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
