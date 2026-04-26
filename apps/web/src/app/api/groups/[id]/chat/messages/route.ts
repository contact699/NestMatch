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
