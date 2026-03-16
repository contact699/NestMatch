import { withApiHandler, apiResponse } from '@/lib/api/with-handler'
import { createServiceClient } from '@/lib/supabase/service'
import { createNotification } from '@/lib/notifications'

// One-time backfill: create notifications for all existing pending join requests
export const POST = withApiHandler(
  async (req, { userId, requestId }) => {
    const svcClient = (() => {
      try { return createServiceClient() } catch { return null }
    })()

    if (!svcClient) {
      return apiResponse({ error: 'Service unavailable' }, 500, requestId)
    }

    // Get all pending join requests
    const { data: pendingRequests, error: fetchError } = await (svcClient as any)
      .from('co_renter_join_requests')
      .select('id, group_id, user_id')
      .eq('status', 'pending')

    if (fetchError) throw fetchError
    if (!pendingRequests || pendingRequests.length === 0) {
      return apiResponse({ message: 'No pending requests to backfill', count: 0 }, 200, requestId)
    }

    let created = 0

    for (const jr of pendingRequests) {
      // Get requester name
      const { data: requesterProfile } = await svcClient
        .from('profiles')
        .select('name')
        .eq('user_id', jr.user_id)
        .single()

      // Get group name
      const { data: groupInfo } = await svcClient
        .from('co_renter_groups')
        .select('name')
        .eq('id', jr.group_id)
        .single()

      // Get group admins
      const { data: admins } = await svcClient
        .from('co_renter_members')
        .select('user_id')
        .eq('group_id', jr.group_id)
        .eq('role', 'admin')
        .eq('status', 'active')

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          // Check if notification already exists to avoid duplicates
          const { data: existing } = await (svcClient as any)
            .from('notifications')
            .select('id')
            .eq('user_id', admin.user_id)
            .eq('type', 'join_request_received')
            .contains('metadata', { request_id: jr.id })
            .limit(1)

          if (!existing || existing.length === 0) {
            await createNotification({
              userId: admin.user_id,
              type: 'join_request_received',
              title: 'New join request',
              body: `${requesterProfile?.name || 'Someone'} wants to join ${groupInfo?.name || 'your group'}`,
              link: `/groups/${jr.group_id}`,
              metadata: { group_id: jr.group_id, request_id: jr.id, requester_id: jr.user_id },
            })
            created++
          }
        }
      }
    }

    return apiResponse({ message: `Backfilled ${created} notifications`, count: created }, 200, requestId)
  }
)
