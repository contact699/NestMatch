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
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        listings (
          id,
          title,
          photos
        )
      `)
      .contains('participant_ids', [userId!])
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (error) throw error

    const convList = conversations || []

    if (convList.length === 0) {
      return apiResponse({ conversations: [] }, 200, requestId)
    }

    // Collect IDs for batch queries
    const conversationIds = convList.map((conv: any) => conv.id)
    const otherParticipantIds = convList
      .map((conv: any) =>
        conv.participant_ids.find((id: string) => id !== userId!)
      )
      .filter(Boolean) as string[]

    const uniqueParticipantIds = [...new Set(otherParticipantIds)]

    // Batch query 1: Fetch all other participant profiles in one query
    const { data: profiles } = uniqueParticipantIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, user_id, name, profile_photo, verification_level')
          .in('user_id', uniqueParticipantIds)
      : { data: [] }

    const profilesByUserId = new Map(
      (profiles || []).map((p: any) => [p.user_id, p])
    )

    // Batch query 2: Fetch recent messages for all conversations in one query
    // We fetch more than needed and deduplicate to get the latest per conversation
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('id, content, sender_id, created_at, read_at, conversation_id')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })

    // Keep only the latest message per conversation
    const lastMessageByConvId = new Map<string, any>()
    for (const msg of recentMessages || []) {
      if (!lastMessageByConvId.has(msg.conversation_id)) {
        lastMessageByConvId.set(msg.conversation_id, msg)
      }
    }

    // Batch query 3: Fetch all unread messages (from others) in one query
    const { data: unreadMessages } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId!)
      .is('read_at', null)

    // Group unread counts by conversation
    const unreadCountByConvId = new Map<string, number>()
    for (const msg of unreadMessages || []) {
      unreadCountByConvId.set(
        msg.conversation_id,
        (unreadCountByConvId.get(msg.conversation_id) || 0) + 1
      )
    }

    // Assemble results
    const conversationsWithDetails = convList.map((conv: any) => {
      const otherParticipantId = conv.participant_ids.find(
        (id: string) => id !== userId!
      )

      const lastMessage = lastMessageByConvId.get(conv.id) || null
      // Strip conversation_id from the last message to match original shape
      const lastMessageClean = lastMessage
        ? {
            id: lastMessage.id,
            content: lastMessage.content,
            sender_id: lastMessage.sender_id,
            created_at: lastMessage.created_at,
            read_at: lastMessage.read_at,
          }
        : null

      return {
        ...conv,
        other_profile: otherParticipantId
          ? profilesByUserId.get(otherParticipantId) || null
          : null,
        last_message: lastMessageClean,
        unread_count: unreadCountByConvId.get(conv.id) || 0,
      }
    })

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
      throw new ValidationError('Cannot start conversation with yourself')
    }

    // Check if conversation already exists between these users
    let existingConversation = null

    if (listing_id) {
      // Check for conversation with this specific listing
      const { data } = await supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [userId!, participant_id])
        .eq('listing_id', listing_id)
        .single()
      existingConversation = data
    } else {
      // Check for any existing conversation between these users (without listing)
      const { data } = await supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [userId!, participant_id])
        .is('listing_id', null)
        .single()
      existingConversation = data
    }

    if (existingConversation) {
      return apiResponse({ conversation: existingConversation }, 200, requestId)
    }

    // Check if blocked
    const { data: blocked } = await supabase
      .from('blocked_users')
      .select('id')
      .or(`user_id.eq.${userId!},user_id.eq.${participant_id}`)
      .or(`blocked_user_id.eq.${userId!},blocked_user_id.eq.${participant_id}`)
      .limit(1)

    if (blocked && blocked.length > 0) {
      return apiResponse({ error: 'Cannot message this user' }, 403, requestId)
    }

    // Create new conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        participant_ids: [userId!, participant_id],
        listing_id: listing_id || null,
      })
      .select()
      .single()

    if (error) throw error

    // Send initial message if provided
    if (initial_message && conversation) {
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: userId!,
          content: initial_message,
        })

      await supabase
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
