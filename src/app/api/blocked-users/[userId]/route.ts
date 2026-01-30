import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ userId: string }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: blockedUserId } = await params
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

    // Unblock user
    const { error } = await (supabase as any)
      .from('blocked_users')
      .delete()
      .eq('user_id', user.id)
      .eq('blocked_user_id', blockedUserId) as { error: any }

    if (error) {
      console.error('Error unblocking user:', error)
      return NextResponse.json(
        { error: 'Failed to unblock user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/blocked-users/[userId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
