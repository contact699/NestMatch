import { NextRequest } from 'next/server'
import { withApiHandler, apiResponse, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'

export const PUT = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const messageId = params.id

    // Get message and verify user can mark it as read
    const { data: message, error: messageError } = await (supabase as any)
      .from('messages')
      .select(`
        id,
        sender_id,
        conversation_id,
        conversations (
          participant_ids
        )
      `)
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      throw new NotFoundError('Message not found')
    }

    const conversation = message.conversations as any

    // User must be a participant and not the sender
    if (!conversation.participant_ids.includes(userId)) {
      throw new AuthorizationError('Forbidden')
    }

    if (message.sender_id === userId) {
      return apiResponse({ error: 'Cannot mark your own message as read' }, 400, requestId)
    }

    // Mark as read
    const { error } = await (supabase as any)
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)

    if (error) throw error

    return apiResponse({ success: true }, 200, requestId)
  }
)
