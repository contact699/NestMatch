import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateGroupSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  combined_budget_min: z.number().positive().optional(),
  combined_budget_max: z.number().positive().optional(),
  target_move_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  preferred_cities: z.array(z.string()).optional(),
  status: z.enum(['forming', 'searching', 'matched']).optional(),
})

// Get a specific group
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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

    const { data: group, error } = await (supabase as any)
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
            profile_photo,
            email,
            bio
          )
        ),
        invitations:co_renter_invitations(
          id,
          status,
          created_at,
          inviter:profiles!co_renter_invitations_inviter_id_fkey(
            name
          ),
          invitee:profiles!co_renter_invitations_invitee_id_fkey(
            user_id,
            name,
            profile_photo
          )
        )
      `)
      .eq('id', id)
      .single() as { data: any; error: any }

    if (error || !group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // Verify user is a member
    const isMember = group.members?.some((m: any) => m.user?.user_id === user.id)
    if (!isMember) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const userMember = group.members?.find((m: any) => m.user?.user_id === user.id)

    return NextResponse.json({
      group: {
        ...group,
        user_role: userMember?.role || 'member',
        is_admin: userMember?.role === 'admin',
      },
    })
  } catch (error) {
    console.error('Error in GET /api/groups/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update a group (admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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

    // Check if user is admin of the group
    const { data: membership } = await (supabase as any)
      .from('co_renter_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', user.id)
      .single() as { data: any }

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can update the group' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = updateGroupSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    const allowedFields = [
      'name', 'description', 'combined_budget_min', 'combined_budget_max',
      'target_move_date', 'preferred_cities', 'status'
    ]

    for (const field of allowedFields) {
      if (validationResult.data[field as keyof typeof validationResult.data] !== undefined) {
        updateData[field] = validationResult.data[field as keyof typeof validationResult.data]
      }
    }

    const { data: group, error: updateError } = await (supabase as any)
      .from('co_renter_groups')
      .update(updateData)
      .eq('id', id)
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
      .single()

    if (updateError) {
      console.error('Error updating group:', updateError)
      return NextResponse.json(
        { error: 'Failed to update group' },
        { status: 500 }
      )
    }

    return NextResponse.json({ group })
  } catch (error) {
    console.error('Error in PUT /api/groups/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete a group (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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

    // Check if user is admin of the group
    const { data: membership } = await (supabase as any)
      .from('co_renter_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', user.id)
      .single() as { data: any }

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete the group' },
        { status: 403 }
      )
    }

    // Delete in order: invitations, members, then group
    await (supabase as any)
      .from('co_renter_invitations')
      .delete()
      .eq('group_id', id)

    await (supabase as any)
      .from('co_renter_members')
      .delete()
      .eq('group_id', id)

    const { error: deleteError } = await (supabase as any)
      .from('co_renter_groups')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting group:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete group' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/groups/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
