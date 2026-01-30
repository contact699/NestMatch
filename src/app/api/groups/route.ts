import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createGroupSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  combined_budget_min: z.number().positive().optional(),
  combined_budget_max: z.number().positive().optional(),
  target_move_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  preferred_cities: z.array(z.string()).optional(),
})

// Get user's co-renter groups
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Get groups where user is a member
    let query = (supabase as any)
      .from('co_renter_groups')
      .select(`
        *,
        members:co_renter_members(
          id,
          role,
          budget_contribution,
          joined_at,
          user:profiles(
            user_id,
            name,
            profile_photo
          )
        ),
        invitations:co_renter_invitations(
          id,
          status,
          invitee:profiles!co_renter_invitations_invitee_id_fkey(
            user_id,
            name,
            profile_photo
          )
        )
      `)

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('created_at', { ascending: false })

    const { data: allGroups, error } = await query as { data: any[]; error: any }

    if (error) {
      console.error('Error fetching groups:', error)
      return NextResponse.json(
        { error: 'Failed to fetch groups' },
        { status: 500 }
      )
    }

    // Filter to only groups where user is a member
    const userGroups = (allGroups || []).filter((group: any) =>
      group.members?.some((m: any) => m.user?.user_id === user.id)
    )

    // Add user's role to each group
    const enrichedGroups = userGroups.map((group: any) => {
      const userMember = group.members?.find((m: any) => m.user?.user_id === user.id)
      return {
        ...group,
        user_role: userMember?.role || 'member',
        member_count: group.members?.length || 0,
        pending_invitations: group.invitations?.filter((i: any) => i.status === 'pending').length || 0,
      }
    })

    return NextResponse.json({ groups: enrichedGroups })
  } catch (error) {
    console.error('Error in GET /api/groups:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create a new co-renter group
export async function POST(request: NextRequest) {
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

    const body = await request.json()

    const validationResult = createGroupSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const {
      name,
      description,
      combined_budget_min,
      combined_budget_max,
      target_move_date,
      preferred_cities,
    } = validationResult.data

    // Create group
    const { data: group, error: groupError } = await (supabase as any)
      .from('co_renter_groups')
      .insert({
        name,
        description,
        combined_budget_min,
        combined_budget_max,
        target_move_date,
        preferred_cities,
        status: 'forming',
      })
      .select()
      .single()

    if (groupError) {
      console.error('Error creating group:', groupError)
      return NextResponse.json(
        { error: 'Failed to create group' },
        { status: 500 }
      )
    }

    // Add creator as admin member
    const { error: memberError } = await (supabase as any)
      .from('co_renter_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
        budget_contribution: combined_budget_min ? combined_budget_min / 2 : null, // Default to half
      })

    if (memberError) {
      console.error('Error adding member:', memberError)
      // Rollback group creation
      await (supabase as any)
        .from('co_renter_groups')
        .delete()
        .eq('id', group.id)

      return NextResponse.json(
        { error: 'Failed to create group membership' },
        { status: 500 }
      )
    }

    // Fetch complete group with members
    const { data: completeGroup } = await (supabase as any)
      .from('co_renter_groups')
      .select(`
        *,
        members:co_renter_members(
          id,
          role,
          budget_contribution,
          user:profiles(
            user_id,
            name,
            profile_photo
          )
        )
      `)
      .eq('id', group.id)
      .single()

    return NextResponse.json({ group: completeGroup }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/groups:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
