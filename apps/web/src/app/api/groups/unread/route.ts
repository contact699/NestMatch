import { withApiHandler, apiResponse } from '@/lib/api/with-handler'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'

// Returns unread group-chat counts for the calling user.
// Shape: { totalUnread: number, byGroup: Record<groupId, number> }
//
// Drives:
//   - per-group badge on /groups list rows
//   - aggregate badge on the Groups nav link
//
// Counts messages where:
//   - the conversation's group_id matches an active membership
//   - the message was sent after that membership's last_read_at
//   - the sender wasn't the caller (your own messages don't count as unread)
export const GET = withApiHandler(
  async (_req, { userId, requestId }) => {
    const service = (() => {
      try { return createServiceClient() } catch { return null }
    })()
    if (!service) {
      throw new Error('Service client unavailable')
    }

    // Active memberships for this user, with last_read_at
    const { data: memberships, error: memErr } = await service
      .from('co_renter_members')
      .select('group_id, last_read_at')
      .eq('user_id', userId!)
      .eq('status', 'active')

    if (memErr) {
      logger.error(
        'unread: membership fetch failed',
        memErr instanceof Error ? memErr : new Error(String(memErr)),
        { requestId, userId: userId! },
      )
      return apiResponse({ totalUnread: 0, byGroup: {} }, 200, requestId)
    }

    const rows = memberships ?? []
    if (rows.length === 0) {
      return apiResponse({ totalUnread: 0, byGroup: {} }, 200, requestId)
    }

    // Resolve each group's conversation_id (one per group). Single query.
    const groupIds = rows.map((r) => r.group_id)
    const { data: conversations } = await service
      .from('conversations')
      .select('id, group_id')
      .in('group_id', groupIds)

    const conversationByGroup: Record<string, string> = {}
    for (const c of conversations ?? []) {
      if (c.group_id) conversationByGroup[c.group_id] = c.id
    }

    // For each membership, count messages newer than last_read_at not sent
    // by the caller. Per-group head-count queries; N is small (1-3 typical).
    const byGroup: Record<string, number> = {}
    let totalUnread = 0

    await Promise.all(
      rows.map(async (m) => {
        const conversationId = conversationByGroup[m.group_id]
        if (!conversationId) {
          byGroup[m.group_id] = 0
          return
        }
        const lastRead = m.last_read_at ?? '1970-01-01T00:00:00Z'
        const { count, error } = await service
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conversationId)
          .gt('created_at', lastRead)
          .neq('sender_id', userId!)

        if (error) {
          byGroup[m.group_id] = 0
          return
        }
        const n = count ?? 0
        byGroup[m.group_id] = n
        totalUnread += n
      }),
    )

    return apiResponse({ totalUnread, byGroup }, 200, requestId)
  },
  { rateLimit: 'api' },
)
