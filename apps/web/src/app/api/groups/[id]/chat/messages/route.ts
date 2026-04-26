import { z } from 'zod'
import {
  withApiHandler,
  apiResponse,
  parseBody,
  NotFoundError,
  AuthorizationError,
} from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'
import { sendEmail } from '@/lib/email'
import { newGroupMessageEmail } from '@/lib/email-templates'

const sendSchema = z.object({
  content: z.string().trim().min(1, 'Message cannot be empty').max(5000),
})

// Send a message into a group's chat. The conversation must already exist
// (init endpoint creates it lazily on chat open). Authorization: caller must
// be an active group member.
export const POST = withApiHandler(
  async (req, { userId, requestId, params }) => {
    const groupId = params?.id
    if (!groupId) throw new NotFoundError('Group')

    let body: z.infer<typeof sendSchema>
    try {
      body = await parseBody(req, sendSchema)
    } catch {
      throw new ValidationError('Invalid message content')
    }

    const service = (() => {
      try { return createServiceClient() } catch { return null }
    })()
    if (!service) {
      throw new Error('Service client unavailable')
    }

    // Authorize active membership
    const { data: membership } = await service
      .from('co_renter_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId!)
      .eq('status', 'active')
      .maybeSingle()
    if (!membership) {
      throw new AuthorizationError('Not a member of this group')
    }

    // Find the group's conversation row
    const { data: conversation } = await service
      .from('conversations')
      .select('id')
      .eq('group_id', groupId)
      .maybeSingle()
    if (!conversation) {
      throw new NotFoundError('Group conversation')
    }

    // Insert message
    const { data: message, error } = await service
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: userId!,
        content: body.content,
      })
      .select('id, conversation_id, sender_id, content, created_at')
      .single()

    if (error || !message) {
      logger.error(
        'Group message insert failed',
        error instanceof Error ? error : new Error(String(error || 'unknown')),
        { requestId, groupId, userId: userId! },
      )
      return apiResponse(
        { error: 'Could not send message. Please try again.' },
        500,
        requestId,
      )
    }

    // Touch conversation's last_message_at for /messages list ordering
    // (group conversations are filtered out of that list, but keeping this
    // accurate is cheap and useful for future surfaces).
    void service
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation.id)
      .then(() => {}, () => {})

    // Fire-and-forget email notification to other members. Skips recipients
    // who were active in the last 5 minutes or were emailed about this group
    // in the last 30 minutes.
    void notifyGroupChatRecipients(service, groupId, userId!, requestId)

    return apiResponse({ message }, 201, requestId)
  },
  {
    rateLimit: 'messageSend',
    audit: {
      action: 'create',
      resourceType: 'message',
      getResourceId: (_req, res) => res?.message?.id,
    },
  },
)

// ---------------------------------------------------------------------------
// Email notifications
// ---------------------------------------------------------------------------

/** Skip email if recipient was active within this window (matches 1:1 chat). */
const RECENTLY_ACTIVE_MS = 5 * 60 * 1000
/** Per-recipient-per-group cooldown — at most one email per 30 minutes. */
const EMAIL_COOLDOWN_MS = 30 * 60 * 1000

async function notifyGroupChatRecipients(
  client: ReturnType<typeof createServiceClient>,
  groupId: string,
  senderId: string,
  requestId: string,
): Promise<void> {
  try {
    // Group + sender + members in parallel. Profiles are pulled separately
    // because the Database type doesn't expose the relationship between
    // co_renter_members and profiles, so a join would resolve to never.
    const [groupRes, senderRes, membersRes] = await Promise.all([
      client.from('co_renter_groups').select('id, name').eq('id', groupId).maybeSingle(),
      client.from('profiles').select('name').eq('user_id', senderId).maybeSingle(),
      client
        .from('co_renter_members')
        .select('id, user_id, last_chat_email_at')
        .eq('group_id', groupId)
        .eq('status', 'active'),
    ])

    const group = groupRes.data
    if (!group) return
    const senderName = senderRes.data?.name || 'A group member'
    const members = membersRes.data ?? []
    if (members.length === 0) return

    // Fetch the profiles for all (other) members in a single query.
    const otherUserIds = members
      .map((m) => m.user_id)
      .filter((id) => id !== senderId)
    if (otherUserIds.length === 0) return

    const { data: profileRows } = await client
      .from('profiles')
      .select('user_id, name, email, last_seen_at')
      .in('user_id', otherUserIds)

    const profilesByUser = new Map<
      string,
      { name: string | null; email: string | null; last_seen_at: string | null }
    >()
    for (const p of profileRows ?? []) {
      profilesByUser.set(p.user_id, {
        name: p.name,
        email: p.email,
        last_seen_at: p.last_seen_at,
      })
    }

    const now = Date.now()

    for (const member of members) {
      if (member.user_id === senderId) continue
      const profile = profilesByUser.get(member.user_id)
      if (!profile?.email) continue

      // Active in app — they'll see the message in real-time, no email needed.
      if (profile.last_seen_at) {
        const seen = new Date(profile.last_seen_at).getTime()
        if (now - seen < RECENTLY_ACTIVE_MS) continue
      }

      // Already emailed about this group recently — respect the cooldown.
      if (member.last_chat_email_at) {
        const sent = new Date(member.last_chat_email_at).getTime()
        if (now - sent < EMAIL_COOLDOWN_MS) continue
      }

      const recipientName = profile.name || 'there'
      const { subject, html } = newGroupMessageEmail(
        recipientName,
        group.name,
        group.id,
        senderName,
      )

      const result = await sendEmail({ to: profile.email, subject, html })
      if (result.success) {
        // Bump cooldown only on successful (or mocked) send so failures don't
        // hide future legitimate notifications.
        await client
          .from('co_renter_members')
          .update({ last_chat_email_at: new Date().toISOString() })
          .eq('id', member.id)
        logger.info('Sent group chat email notification', {
          requestId,
          groupId,
          recipientId: member.user_id,
        })
      }
    }
  } catch (error) {
    logger.error(
      'Group chat email notification failed',
      error instanceof Error ? error : new Error(String(error)),
      { requestId, groupId, senderId },
    )
  }
}
