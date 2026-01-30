import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
      .contains('participant_ids', [user.id])
      .order('last_message_at', { ascending: false, nullsFirst: false }) as { data: any[] | null; error: any }

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      )
    }

    // Fetch participant profiles and last message for each conversation
    const conversationsWithDetails = await Promise.all(
      (conversations || []).map(async (conv) => {
        // Get other participant's profile
        const otherParticipantId = conv.participant_ids.find(
          (id: string) => id !== user.id
        )

        let otherProfile = null
        if (otherParticipantId) {
          const { data: profile } = await (supabase as any)
            .from('profiles')
            .select('id, user_id, name, profile_photo, verification_level')
            .eq('user_id', otherParticipantId)
            .single() as { data: any; error: any }
          otherProfile = profile
        }

        // Get last message
        const { data: messages } = await (supabase as any)
          .from('messages')
          .select('id, content, sender_id, created_at, read_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1) as { data: any[] | null; error: any }

        const lastMessage = messages?.[0] || null

        // Get unread count
        const { count: unreadCount } = await (supabase as any)
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', user.id)
          .is('read_at', null) as { count: number | null; error: any }

        return {
          ...conv,
          other_profile: otherProfile,
          last_message: lastMessage,
          unread_count: unreadCount || 0,
        }
      })
    )

    return NextResponse.json({ conversations: conversationsWithDetails })
  } catch (error) {
    console.error('Error in GET /api/conversations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { participant_id, listing_id, initial_message } = body

    if (!participant_id) {
      return NextResponse.json(
        { error: 'participant_id is required' },
        { status: 400 }
      )
    }

    if (participant_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot start conversation with yourself' },
        { status: 400 }
      )
    }

    // Check if conversation already exists between these users
    let existingConversation = null

    if (listing_id) {
      // Check for conversation with this specific listing
      const { data } = await (supabase as any)
        .from('conversations')
        .select('id')
        .contains('participant_ids', [user.id, participant_id])
        .eq('listing_id', listing_id)
        .single() as { data: any; error: any }
      existingConversation = data
    } else {
      // Check for any existing conversation between these users (without listing)
      const { data } = await (supabase as any)
        .from('conversations')
        .select('id')
        .contains('participant_ids', [user.id, participant_id])
        .is('listing_id', null)
        .single() as { data: any; error: any }
      existingConversation = data
    }

    if (existingConversation) {
      return NextResponse.json({ conversation: existingConversation })
    }

    // Check if blocked
    const { data: blocked } = await (supabase as any)
      .from('blocked_users')
      .select('id')
      .or(`user_id.eq.${user.id},user_id.eq.${participant_id}`)
      .or(`blocked_user_id.eq.${user.id},blocked_user_id.eq.${participant_id}`)
      .limit(1) as { data: any[] | null; error: any }

    if (blocked && blocked.length > 0) {
      return NextResponse.json(
        { error: 'Cannot message this user' },
        { status: 403 }
      )
    }

    // Create new conversation
    const { data: conversation, error } = await (supabase as any)
      .from('conversations')
      .insert({
        participant_ids: [user.id, participant_id],
        listing_id: listing_id || null,
      })
      .select()
      .single() as { data: any; error: any }

    if (error) {
      console.error('Error creating conversation:', error)
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      )
    }

    // Send initial message if provided
    if (initial_message && conversation) {
      await (supabase as any)
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: initial_message,
        })

      await (supabase as any)
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id)
    }

    return NextResponse.json({ conversation }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/conversations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
