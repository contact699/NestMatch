import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('Auth error in conversation GET:', authError)
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

    // Get conversation
    const { data: conversation, error } = await (supabase as any)
      .from('conversations')
      .select(`
        *,
        listings (
          id,
          title,
          photos,
          price,
          city,
          province
        )
      `)
      .eq('id', id)
      .single() as { data: any; error: any }

    if (error) {
      console.error('Conversation query error:', error)
      return NextResponse.json(
        { error: 'Conversation not found', details: error.message },
        { status: 404 }
      )
    }

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Check if user is a participant
    if (!conversation.participant_ids || !conversation.participant_ids.includes(user.id)) {
      return NextResponse.json(
        { error: 'Forbidden - not a participant' },
        { status: 403 }
      )
    }

    // Get other participant's profile
    const otherParticipantId = conversation.participant_ids.find(
      (pid: string) => pid !== user.id
    )

    let otherProfile = null
    if (otherParticipantId) {
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('id, user_id, name, profile_photo, verification_level, bio')
        .eq('user_id', otherParticipantId)
        .single() as { data: any; error: any }
      otherProfile = profile
    }

    return NextResponse.json({
      conversation: {
        ...conversation,
        other_profile: otherProfile,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/conversations/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
