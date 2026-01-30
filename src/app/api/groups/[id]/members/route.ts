import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateMemberSchema = z.object({
  member_id: z.string().uuid(),
  budget_contribution: z.number().positive().optional(),
  role: z.enum(['admin', 'member']).optional(),
})

const removeMemberSchema = z.object({
  member_id: z.string().uuid(),
})

// Update a member's details (admin only, or self for budget)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: groupId } = await params
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
    const validationResult = updateMemberSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { member_id, budget_contribution, role } = validationResult.data

    // Get current user's membership
    const { data: currentMember } = await (supabase as any)
      .from('co_renter_members')
      .select('role, user_id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single() as { data: any }

    if (!currentMember) {
      return NextResponse.json(
        { error: 'You are not a member of this group' },
        { status: 403 }
      )
    }

    // Get target member
    const { data: targetMember } = await (supabase as any)
      .from('co_renter_members')
      .select('*')
      .eq('id', member_id)
      .eq('group_id', groupId)
      .single() as { data: any }

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    const isAdmin = currentMember.role === 'admin'
    const isSelf = targetMember.user_id === user.id

    // Check permissions
    if (role && !isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can change member roles' },
        { status: 403 }
      )
    }

    if (budget_contribution !== undefined && !isAdmin && !isSelf) {
      return NextResponse.json(
        { error: 'You can only update your own budget contribution' },
        { status: 403 }
      )
    }

    // Build update data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (budget_contribution !== undefined) {
      updateData.budget_contribution = budget_contribution
    }

    if (role !== undefined && isAdmin) {
      // Prevent removing the last admin
      if (role === 'member' && targetMember.role === 'admin') {
        const { data: admins } = await (supabase as any)
          .from('co_renter_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('role', 'admin') as { data: any[] }

        if (admins?.length === 1) {
          return NextResponse.json(
            { error: 'Cannot remove the last admin. Promote another member first.' },
            { status: 400 }
          )
        }
      }
      updateData.role = role
    }

    const { data: member, error: updateError } = await (supabase as any)
      .from('co_renter_members')
      .update(updateData)
      .eq('id', member_id)
      .select(`
        *,
        user:profiles(
          user_id,
          name,
          profile_photo
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating member:', updateError)
      return NextResponse.json(
        { error: 'Failed to update member' },
        { status: 500 }
      )
    }

    return NextResponse.json({ member })
  } catch (error) {
    console.error('Error in PUT /api/groups/[id]/members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Remove a member (admin only, or self to leave)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: groupId } = await params
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
    const validationResult = removeMemberSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { member_id } = validationResult.data

    // Get current user's membership
    const { data: currentMember } = await (supabase as any)
      .from('co_renter_members')
      .select('role, user_id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single() as { data: any }

    if (!currentMember) {
      return NextResponse.json(
        { error: 'You are not a member of this group' },
        { status: 403 }
      )
    }

    // Get target member
    const { data: targetMember } = await (supabase as any)
      .from('co_renter_members')
      .select('*')
      .eq('id', member_id)
      .eq('group_id', groupId)
      .single() as { data: any }

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    const isAdmin = currentMember.role === 'admin'
    const isSelf = targetMember.user_id === user.id

    // Check permissions
    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: 'Only admins can remove other members' },
        { status: 403 }
      )
    }

    // Prevent removing the last admin (unless leaving)
    if (targetMember.role === 'admin') {
      const { data: admins } = await (supabase as any)
        .from('co_renter_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('role', 'admin') as { data: any[] }

      if (admins?.length === 1) {
        // Check if there are other members to promote
        const { data: otherMembers } = await (supabase as any)
          .from('co_renter_members')
          .select('id')
          .eq('group_id', groupId)
          .neq('id', member_id) as { data: any[] }

        if (otherMembers && otherMembers.length > 0) {
          return NextResponse.json(
            { error: 'Cannot leave as the last admin. Promote another member first or delete the group.' },
            { status: 400 }
          )
        }
        // If no other members, allow leaving and group will be orphaned (or could auto-delete)
      }
    }

    const { error: deleteError } = await (supabase as any)
      .from('co_renter_members')
      .delete()
      .eq('id', member_id)

    if (deleteError) {
      console.error('Error removing member:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: isSelf ? 'You have left the group' : 'Member removed from group',
    })
  } catch (error) {
    console.error('Error in DELETE /api/groups/[id]/members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
