import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000),
})

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: conversationId } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('Auth error in messages GET:', authError)
      return NextResponse.json(
        { error: 'Authentication error', details: authError.message },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - no user' },
        { status: 401 }
      )
    }

    // Verify user is participant in this conversation
    const { data: conversation, error: convError } = await (supabase as any)
      .from('conversations')
      .select('participant_ids')
      .eq('id', conversationId)
      .single() as { data: any; error: any }

    if (convError) {
      console.error('Conversation query error:', convError)
      return NextResponse.json(
        { error: 'Conversation not found', details: convError.message },
        { status: 404 }
      )
    }

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    if (!conversation.participant_ids || !conversation.participant_ids.includes(user.id)) {
      return NextResponse.json(
        { error: 'Forbidden - not a participant' },
        { status: 403 }
      )
    }

    // Get query params for pagination
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before') // Message ID to fetch before

    // Fetch messages
    let query = (supabase as any)
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      const { data: beforeMessage } = await (supabase as any)
        .from('messages')
        .select('created_at')
        .eq('id', before)
        .single()

      if (beforeMessage) {
        query = query.lt('created_at', beforeMessage.created_at)
      }
    }

    const { data: messages, error } = await query as { data: any[]; error: any }

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: error.message },
        { status: 500 }
      )
    }

    // Mark unread messages as read (wrapped in try-catch to not fail the request)
    const unreadMessageIds = (messages || [])
      .filter((m: any) => m.sender_id !== user.id && !m.read_at)
      .map((m: any) => m.id)

    if (unreadMessageIds.length > 0) {
      // Fire and forget - don't await, don't block
      (supabase as any)
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadMessageIds)
        .then(() => {})
        .catch((err: any) => console.error('Error marking messages as read:', err))
    }

    // Return messages in chronological order
    return NextResponse.json({
      messages: (messages || []).reverse(),
    })
  } catch (error) {
    console.error('Error in GET /api/conversations/[id]/messages:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: conversationId } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('Auth error in messages POST:', authError)
      return NextResponse.json(
        { error: 'Authentication error', details: authError.message },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - no user' },
        { status: 401 }
      )
    }

    // Verify user is participant in this conversation
    const { data: conversation, error: convError } = await (supabase as any)
      .from('conversations')
      .select('participant_ids')
      .eq('id', conversationId)
      .single() as { data: any; error: any }

    if (convError) {
      console.error('Conversation query error in POST:', convError)
      return NextResponse.json(
        { error: 'Conversation not found', details: convError.message },
        { status: 404 }
      )
    }

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    if (!conversation.participant_ids || !conversation.participant_ids.includes(user.id)) {
      return NextResponse.json(
        { error: 'Forbidden - not a participant' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate input
    const validationResult = messageSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { content } = validationResult.data

    // Insert message
    const { data: message, error } = await (supabase as any)
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
      })
      .select()
      .single()

    if (error) {
      console.error('Error sending message:', error)
      return NextResponse.json(
        { error: 'Failed to send message', details: error.message },
        { status: 500 }
      )
    }

    // Update conversation last_message_at (fire and forget)
    (supabase as any)
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)
      .then(() => {})
      .catch((err: any) => console.error('Error updating conversation timestamp:', err))

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/conversations/[id]/messages:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
