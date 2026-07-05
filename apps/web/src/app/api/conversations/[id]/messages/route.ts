import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { NotFoundError, AuthorizationError, ValidationError } from '@/lib/error-reporter'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/email'
import { newMessageEmail } from '@/lib/email-templates'
import { logger } from '@/lib/logger'

const messageSchema = z.object({
  content: z.string().max(5000).default(''),
  attachment_url: z.string().url().optional(),
  attachment_type: z.enum(['image', 'video', 'document', 'gif']).optional(),
  attachment_name: z.string().max(255).optional(),
}).refine(
  (data) => data.content.trim().length > 0 || data.attachment_url,
  { message: 'Message must have content or an attachment' }
)

export const GET = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const conversationId = params?.id
    if (!conversationId) throw new NotFoundError('Conversation')

    // Verify user is participant
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('participant_ids')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      throw new NotFoundError('Conversation', conversationId)
    }

    if (!conversation.participant_ids?.includes(userId!)) {
      throw new AuthorizationError('Not a participant in this conversation')
    }

    // Get pagination params
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before')

    // Fetch messages
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      const { data: beforeMessage } = await supabase
        .from('messages')
        .select('created_at')
        .eq('id', before)
        .single()

      if (beforeMessage) {
        query = query.lt('created_at', beforeMessage.created_at)
      }
    }

    const { data: messages, error } = await query

    if (error) throw error

    // Mark unread messages as read (fire and forget)
    const unreadIds = (messages || [])
      .filter((m: any) => m.sender_id !== userId! && !m.read_at)
      .map((m: any) => m.id)

    if (unreadIds.length > 0) {
      // Try updating with status column; fall back to just read_at if column doesn't exist
      void supabase
        .from('messages')
        .update({ read_at: new Date().toISOString(), status: 'read' })
        .in('id', unreadIds)
        .then(() => {}, () => {
          // status column may not exist yet — retry with just read_at
          void supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadIds)
            .then(() => {}, () => {})
        })
    }

    return apiResponse({ messages: (messages || []).reverse() }, 200, requestId)
  },
  { rateLimit: 'api' }
)

export const POST = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const conversationId = params?.id
    if (!conversationId) throw new NotFoundError('Conversation')

    // Verify user is participant
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('participant_ids, group_id')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      logger.error('Conversation lookup failed for message send', convError instanceof Error ? convError : new Error(String(convError || 'not found')), {
        requestId,
        userId: userId!,
        conversationId,
      })
      throw new NotFoundError('Conversation', conversationId)
    }

    if (!conversation.participant_ids?.includes(userId!)) {
      throw new AuthorizationError('Not a participant in this conversation')
    }

    // Enforce blocks between sender and any other participant.
    // Conversation creation checks blocks, but a block added AFTER a
    // conversation was created must also stop further messages.
    const otherParticipants = (conversation.participant_ids || []).filter(
      (pid) => pid !== userId!
    )
    if (otherParticipants.length > 0) {
      const [senderBlocks, receivedBlocks] = await Promise.all([
        supabase
          .from('blocked_users')
          .select('id')
          .eq('user_id', userId!)
          .in('blocked_user_id', otherParticipants)
          .limit(1),
        supabase
          .from('blocked_users')
          .select('id')
          .in('user_id', otherParticipants)
          .eq('blocked_user_id', userId!)
          .limit(1),
      ])
      if (
        (senderBlocks.data && senderBlocks.data.length > 0) ||
        (receivedBlocks.data && receivedBlocks.data.length > 0)
      ) {
        throw new AuthorizationError('Messaging is blocked between these users')
      }
    }

    // Validate input
    let body: z.infer<typeof messageSchema>
    try {
      body = await parseBody(req, messageSchema)
    } catch (e) {
      throw new ValidationError('Invalid message content')
    }

    const insertPayload = {
      conversation_id: conversationId,
      sender_id: userId!,
      content: body.content || '',
      ...(body.attachment_url ? {
        attachment_url: body.attachment_url,
        attachment_type: body.attachment_type || null,
        attachment_name: body.attachment_name || null,
      } : {}),
    }

    // Use service client for writes after participant authorization to avoid
    // environment-specific RLS drift and to allow profile self-healing.
    const writeClient = (() => {
      try {
        return createServiceClient()
      } catch {
        logger.warn('Service client unavailable for message send; falling back to user-scoped client', {
          requestId,
          userId: userId!,
          conversationId,
        })
        return supabase
      }
    })()

    // Self-heal missing profile rows (sender_id FK on messages depends on profiles.user_id).
    const { data: senderProfile } = await writeClient
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId!)
      .maybeSingle()

    if (!senderProfile) {
      const { data: authUser } = await supabase.auth.getUser()
      const email = authUser.user?.email || `${userId}@example.com`
      const emailVerified = !!authUser.user?.email_confirmed_at

      const { error: profileInsertError } = await writeClient
        .from('profiles')
        .upsert(
          {
            user_id: userId!,
            email,
            email_verified: emailVerified,
          },
          { onConflict: 'user_id' }
        )

      if (profileInsertError) {
        logger.error(
          'Failed to restore missing sender profile before message insert',
          new Error(profileInsertError.message || 'Unknown profile insert error'),
          {
            requestId,
            userId: userId!,
            conversationId,
            errorCode: profileInsertError.code,
            errorDetails: profileInsertError.details,
            usingServiceClient: writeClient !== supabase,
          }
        )
      }
    }

    const { data: message, error: insertError } = await writeClient
      .from('messages')
      .insert(insertPayload)
      .select()
      .single()

    if (insertError) {
      logger.error(
        'Message insert failed',
        new Error(insertError.message || 'Unknown message insert error'),
        {
          requestId,
          userId: userId!,
          conversationId,
          errorCode: insertError.code,
          errorDetails: insertError.details,
          errorHint: insertError.hint,
          usingServiceClient: writeClient !== supabase,
        }
      )
      return apiResponse(
        { error: `Could not send message: ${insertError.message || 'Unknown error'}. Please try again.` },
        500,
        requestId
      )
    }

    // Update conversation timestamp (fire and forget)
    void writeClient
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)
      .then(() => {}, () => {})

    // Send new message email notification to the recipient (fire and forget).
    // Skip if the recipient was active within the last 5 minutes to avoid
    // spamming users who are already in the conversation.
    const recipientIds = (conversation.participant_ids || []).filter(
      (pid: string) => pid !== userId!
    )
    if (recipientIds.length > 0) {
      void notifyMessageRecipients(writeClient, recipientIds, userId!, requestId)
    }

    // Create in-app new_message notifications (fire and forget). For group
    // conversations participant_ids may only hold the creator, so recipients
    // are resolved from active co-renter members instead.
    void notifyNewMessageInApp(
      writeClient,
      conversationId,
      conversation.group_id ?? null,
      conversation.participant_ids || [],
      userId!,
      requestId
    )

    return apiResponse({ message }, 201, requestId)
  },
  {
    rateLimit: 'messageSend',
    audit: {
      action: 'create',
      resourceType: 'message',
      getResourceId: (_req, res) => res?.message?.id,
    },
  }
)

// ============================================
// HELPERS
// ============================================

/** Threshold in milliseconds — skip email if recipient was active within this window */
const RECENTLY_ACTIVE_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Send a new-message email notification to each recipient who hasn't been
 * active in the last 5 minutes.
 */
async function notifyMessageRecipients(
  client: ReturnType<typeof createServiceClient>,
  recipientIds: string[],
  senderId: string,
  requestId: string
): Promise<void> {
  try {
    // Fetch recipient profiles
    const { data: recipients } = await client
      .from('profiles')
      .select('user_id, email, name, last_seen_at')
      .in('user_id', recipientIds)

    if (!recipients || recipients.length === 0) return

    // Fetch sender name
    const { data: senderProfile } = await client
      .from('profiles')
      .select('name')
      .eq('user_id', senderId)
      .single()

    const senderName = senderProfile?.name || 'Someone'
    const now = Date.now()

    for (const recipient of recipients) {
      if (!recipient.email) continue

      // Skip if recipient was recently active
      if (recipient.last_seen_at) {
        const lastSeen = new Date(recipient.last_seen_at).getTime()
        if (now - lastSeen < RECENTLY_ACTIVE_MS) {
          logger.info('Skipping new message email — recipient recently active', {
            requestId,
            recipientId: recipient.user_id,
          })
          continue
        }
      }

      const recipientName = recipient.name || 'there'
      const { subject, html } = newMessageEmail(recipientName, senderName)

      await sendEmail({ to: recipient.email, subject, html })

      logger.info('Sent new message email notification', {
        requestId,
        recipientId: recipient.user_id,
        senderId,
      })
    }
  } catch (error) {
    logger.error(
      'Failed to send new message email notification',
      error instanceof Error ? error : new Error(String(error)),
      { requestId, senderId }
    )
  }
}

/**
 * Create in-app "new message" notifications for the recipients of a message.
 *
 * Recipients:
 * - 1:1 conversation: the other participant_ids (excluding the sender).
 * - group conversation (group_id set): active co-renter members, excluding
 *   the sender (participant_ids may only contain the creator).
 *
 * Dedupe: skip any recipient who already has an UNREAD new_message notification
 * for this conversation, so a burst of messages produces one badge, not many.
 *
 * Notification failures must never break message sending — everything is
 * wrapped in a try/catch that only warns.
 */
async function notifyNewMessageInApp(
  client: ReturnType<typeof createServiceClient>,
  conversationId: string,
  groupId: string | null,
  participantIds: string[],
  senderId: string,
  requestId: string
): Promise<void> {
  try {
    let recipientIds: string[]
    if (groupId) {
      const { data: members } = await client
        .from('co_renter_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .neq('user_id', senderId)
      recipientIds = (members ?? []).map((m) => m.user_id)
    } else {
      recipientIds = participantIds.filter((pid) => pid !== senderId)
    }

    if (recipientIds.length === 0) return

    const { data: senderProfile } = await client
      .from('profiles')
      .select('name')
      .eq('user_id', senderId)
      .single()
    const senderName = senderProfile?.name || 'Someone'

    // One query for everyone who already has an unread badge for this
    // conversation, then one bulk insert for the rest.
    const { data: alreadyNotified } = await client
      .from('notifications')
      .select('user_id')
      .in('user_id', recipientIds)
      .eq('type', 'new_message')
      .is('read_at', null)
      .filter('metadata->>conversation_id', 'eq', conversationId)
    const alreadyNotifiedIds = new Set((alreadyNotified ?? []).map((n) => n.user_id))

    const toNotify = recipientIds.filter((id) => !alreadyNotifiedIds.has(id))
    if (toNotify.length === 0) return

    // Group chats live on the group page, not the 1:1 messages screen.
    const link = groupId ? `/groups/${groupId}` : `/messages/${conversationId}`

    const { error: insertError } = await client.from('notifications').insert(
      toNotify.map((recipientId) => ({
        user_id: recipientId,
        type: 'new_message',
        title: `New message from ${senderName}`,
        body: 'You have a new message',
        link,
        metadata: { conversation_id: conversationId, sender_id: senderId },
      }))
    )
    if (insertError) {
      logger.warn('Failed to insert new_message notifications', {
        requestId,
        conversationId,
        error: insertError.message,
      })
    }
  } catch (error) {
    logger.warn('Failed to create new_message notifications', {
      requestId,
      conversationId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
