import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Get user's pending invitations (across all groups)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

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

    const { data: invitations, error } = await (supabase as any)
      .from('co_renter_invitations')
      .select(`
        *,
        inviter:profiles!co_renter_invitations_inviter_id_fkey(
          user_id,
          name,
          profile_photo
        ),
        group:co_renter_groups(
          id,
          name,
          description,
          combined_budget_min,
          combined_budget_max,
          target_move_date,
          preferred_cities,
          status,
          members:co_renter_members(
            id,
            user:profiles(
              user_id,
              name,
              profile_photo
            )
          )
        )
      `)
      .eq('invitee_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }) as { data: any[]; error: any }

    if (error) {
      console.error('Error fetching invitations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      )
    }

    return NextResponse.json({ invitations: invitations || [] })
  } catch (error) {
    console.error('Error in GET /api/invitations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
