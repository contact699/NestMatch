import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { NotFoundError, AuthorizationError, ValidationError } from '@/lib/error-reporter'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'

const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000),
})

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
      void supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds)
        .then(() => {}, () => {})
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
      .select('participant_ids')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      throw new NotFoundError('Conversation', conversationId)
    }

    if (!conversation.participant_ids?.includes(userId!)) {
      throw new AuthorizationError('Not a participant in this conversation')
    }

    // Validate input
    let content: string
    try {
      const body = await parseBody(req, messageSchema)
      content = body.content
    } catch (e) {
      throw new ValidationError('Invalid message content')
    }

    const insertPayload = {
      conversation_id: conversationId,
      sender_id: userId!,
      content,
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
        }
      )
      return apiResponse(
        { error: 'Could not send message right now. Please try again.' },
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
