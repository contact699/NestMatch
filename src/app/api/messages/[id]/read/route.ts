import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: messageId } = await params
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
      .single() as { data: any; error: any }

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    const conversation = message.conversations as any

    // User must be a participant and not the sender
    if (!conversation.participant_ids.includes(user.id)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    if (message.sender_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot mark your own message as read' },
        { status: 400 }
      )
    }

    // Mark as read
    const { error } = await (supabase as any)
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId) as { error: any }

    if (error) {
      console.error('Error marking message as read:', error)
      return NextResponse.json(
        { error: 'Failed to mark message as read' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /api/messages/[id]/read:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
