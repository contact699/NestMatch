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

    // Get blocked users with profile info
    const { data: blockedUsers, error } = await (supabase as any)
      .from('blocked_users')
      .select(`
        id,
        blocked_user_id,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }) as { data: any[]; error: any }

    if (error) {
      console.error('Error fetching blocked users:', error)
      return NextResponse.json(
        { error: 'Failed to fetch blocked users' },
        { status: 500 }
      )
    }

    // Fetch profiles for blocked users
    const blockedUserIds = (blockedUsers || []).map((b) => b.blocked_user_id)

    let profiles: any[] = []
    if (blockedUserIds.length > 0) {
      const { data: profileData } = await (supabase as any)
        .from('profiles')
        .select('user_id, name, profile_photo')
        .in('user_id', blockedUserIds) as { data: any[] }
      profiles = profileData || []
    }

    // Combine data
    const blockedWithProfiles = (blockedUsers || []).map((b) => ({
      ...b,
      profile: profiles.find((p) => p.user_id === b.blocked_user_id) || null,
    }))

    return NextResponse.json({ blocked_users: blockedWithProfiles })
  } catch (error) {
    console.error('Error in GET /api/blocked-users:', error)
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
    const { user_id: blockedUserId } = body

    if (!blockedUserId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    if (blockedUserId === user.id) {
      return NextResponse.json(
        { error: 'Cannot block yourself' },
        { status: 400 }
      )
    }

    // Check if already blocked
    const { data: existing } = await (supabase as any)
      .from('blocked_users')
      .select('id')
      .eq('user_id', user.id)
      .eq('blocked_user_id', blockedUserId)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'User already blocked' },
        { status: 409 }
      )
    }

    // Block user
    const { data: blocked, error } = await (supabase as any)
      .from('blocked_users')
      .insert({
        user_id: user.id,
        blocked_user_id: blockedUserId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error blocking user:', error)
      return NextResponse.json(
        { error: 'Failed to block user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ blocked }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/blocked-users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
