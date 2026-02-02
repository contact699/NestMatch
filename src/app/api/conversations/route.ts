import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const createConversationSchema = z.object({
  participant_id: z.string().uuid('Invalid participant ID'),
  listing_id: z.string().uuid().optional(),
  initial_message: z.string().max(2000).optional(),
})

export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Get all conversations where user is a participant
    const { data: conversations, error } = await (supabase as any)
      .from('conversations')
      .select(`
        *,
        listings (
          id,
          title,
          photos
        )
      `)
      .contains('participant_ids', [userId])
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (error) throw error

    // Fetch participant profiles and last message for each conversation
    const conversationsWithDetails = await Promise.all(
      (conversations || []).map(async (conv: any) => {
        // Get other participant's profile
        const otherParticipantId = conv.participant_ids.find(
          (id: string) => id !== userId
        )

        let otherProfile = null
        if (otherParticipantId) {
          const { data: profile } = await (supabase as any)
            .from('profiles')
            .select('id, user_id, name, profile_photo, verification_level')
            .eq('user_id', otherParticipantId)
            .single()
          otherProfile = profile
        }

        // Get last message
        const { data: messages } = await (supabase as any)
          .from('messages')
          .select('id, content, sender_id, created_at, read_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const lastMessage = messages?.[0] || null

        // Get unread count
        const { count: unreadCount } = await (supabase as any)
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', userId)
          .is('read_at', null)

        return {
          ...conv,
          other_profile: otherProfile,
          last_message: lastMessage,
          unread_count: unreadCount || 0,
        }
      })
    )

    return apiResponse({ conversations: conversationsWithDetails }, 200, requestId)
  }
)

export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Validate input
    let body: z.infer<typeof createConversationSchema>
    try {
      body = await parseBody(req, createConversationSchema)
    } catch {
      throw new ValidationError('participant_id is required')
    }

    const { participant_id, listing_id, initial_message } = body

    if (participant_id === userId) {
      return apiResponse({ error: 'Cannot start conversation with yourself' }, 400, requestId)
    }

    // Check if conversation already exists between these users
    let existingConversation = null

    if (listing_id) {
      // Check for conversation with this specific listing
      const { data } = await (supabase as any)
        .from('conversations')
        .select('id')
        .contains('participant_ids', [userId, participant_id])
        .eq('listing_id', listing_id)
        .single()
      existingConversation = data
    } else {
      // Check for any existing conversation between these users (without listing)
      const { data } = await (supabase as any)
        .from('conversations')
        .select('id')
        .contains('participant_ids', [userId, participant_id])
        .is('listing_id', null)
        .single()
      existingConversation = data
    }

    if (existingConversation) {
      return apiResponse({ conversation: existingConversation }, 200, requestId)
    }

    // Check if blocked
    const { data: blocked } = await (supabase as any)
      .from('blocked_users')
      .select('id')
      .or(`user_id.eq.${userId},user_id.eq.${participant_id}`)
      .or(`blocked_user_id.eq.${userId},blocked_user_id.eq.${participant_id}`)
      .limit(1)

    if (blocked && blocked.length > 0) {
      return apiResponse({ error: 'Cannot message this user' }, 403, requestId)
    }

    // Create new conversation
    const { data: conversation, error } = await (supabase as any)
      .from('conversations')
      .insert({
        participant_ids: [userId, participant_id],
        listing_id: listing_id || null,
      })
      .select()
      .single()

    if (error) throw error

    // Send initial message if provided
    if (initial_message && conversation) {
      await (supabase as any)
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: userId,
          content: initial_message,
        })

      await (supabase as any)
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id)
    }

    return apiResponse({ conversation }, 201, requestId)
  },
  {
    rateLimit: 'conversationCreate',
    audit: {
      action: 'create',
      resourceType: 'conversation',
      getResourceId: (_req, res) => res?.conversation?.id,
    },
  }
)
