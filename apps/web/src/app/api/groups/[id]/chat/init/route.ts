import { withApiHandler, apiResponse, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'

// Lazy-create the chat conversation for a group and return:
//   - conversationId (used for SELECT messages + real-time subscription)
//   - lastReadAt for the calling user (drives the "new since you last visited" divider)
//   - members (used to label messages by sender name)
//
// Idempotent. Safe to call on every GroupChat mount.
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

    // Authorize: caller must be an active member of the group.
    const { data: membership } = await service
      .from('co_renter_members')
      .select('id, last_read_at')
      .eq('group_id', groupId)
      .eq('user_id', userId!)
      .eq('status', 'active')
      .maybeSingle()

    if (!membership) {
      throw new AuthorizationError('Not a member of this group')
    }

    // Find existing conversation
    let conversationId: string | null = null
    const { data: existing } = await service
      .from('conversations')
      .select('id')
      .eq('group_id', groupId)
      .maybeSingle()

    if (existing) {
      conversationId = existing.id
    } else {
      // Lazy-create. participant_ids is required by the schema for 1:1 chat
      // bookkeeping; for group conversations RLS uses group_id, so any
      // non-empty array is fine. Use the creator as a placeholder.
      const { data: created, error: createErr } = await service
        .from('conversations')
        .insert({
          group_id: groupId,
          participant_ids: [userId!],
        })
        .select('id')
        .single()

      if (createErr || !created) {
        // Race: another member just created it. Re-select.
        const { data: again } = await service
          .from('conversations')
          .select('id')
          .eq('group_id', groupId)
          .maybeSingle()
        if (again) {
          conversationId = again.id
        } else {
          logger.error(
            'Group conversation create failed',
            createErr instanceof Error ? createErr : new Error(String(createErr || 'unknown')),
            { requestId, groupId, userId: userId! },
          )
          throw new Error('Could not initialize group chat')
        }
      } else {
        conversationId = created.id
      }
    }

    // Pull all members of the group for sender labelling. Active or not — left
    // members may still appear as historical senders.
    const { data: memberRows } = await service
      .from('co_renter_members')
      .select('user_id, profiles(user_id, name, profile_photo)')
      .eq('group_id', groupId)

    const members = (memberRows ?? []).map((row: any) => ({
      user_id: row.user_id as string,
      name: (row.profiles?.name ?? null) as string | null,
      profile_photo: (row.profiles?.profile_photo ?? null) as string | null,
    }))

    return apiResponse(
      {
        conversationId,
        lastReadAt: membership.last_read_at ?? null,
        members,
      },
      200,
      requestId,
    )
  },
  { rateLimit: 'api' },
)
