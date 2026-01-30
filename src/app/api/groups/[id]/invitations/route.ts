import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const createInvitationSchema = z.object({
  invitee_id: z.string().uuid(),
})

const respondInvitationSchema = z.object({
  invitation_id: z.string().uuid(),
  response: z.enum(['accept', 'decline']),
  budget_contribution: z.number().positive().optional(),
})

// Get invitations for a group
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Verify user is a member
    const { data: membership } = await (supabase as any)
      .from('co_renter_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single() as { data: any }

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
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
        invitee:profiles!co_renter_invitations_invitee_id_fkey(
          user_id,
          name,
          profile_photo,
          email
        )
      `)
      .eq('group_id', groupId)
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
    console.error('Error in GET /api/groups/[id]/invitations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Send an invitation (admin only)
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Verify user is admin
    const { data: membership } = await (supabase as any)
      .from('co_renter_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single() as { data: any }

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can send invitations' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = createInvitationSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { invitee_id } = validationResult.data

    // Check if invitee exists
    const { data: invitee } = await (supabase as any)
      .from('profiles')
      .select('user_id')
      .eq('user_id', invitee_id)
      .single() as { data: any }

    if (!invitee) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if invitee is already a member
    const { data: existingMember } = await (supabase as any)
      .from('co_renter_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', invitee_id)
      .single() as { data: any }

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this group' },
        { status: 400 }
      )
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await (supabase as any)
      .from('co_renter_invitations')
      .select('id')
      .eq('group_id', groupId)
      .eq('invitee_id', invitee_id)
      .eq('status', 'pending')
      .single() as { data: any }

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'A pending invitation already exists for this user' },
        { status: 400 }
      )
    }

    // Create invitation
    const { data: invitation, error: inviteError } = await (supabase as any)
      .from('co_renter_invitations')
      .insert({
        group_id: groupId,
        inviter_id: user.id,
        invitee_id,
        status: 'pending',
      })
      .select(`
        *,
        invitee:profiles!co_renter_invitations_invitee_id_fkey(
          user_id,
          name,
          profile_photo
        )
      `)
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      )
    }

    // TODO: Send notification to invitee

    return NextResponse.json({ invitation }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/groups/[id]/invitations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Respond to an invitation (accept/decline)
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
    const validationResult = respondInvitationSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { invitation_id, response, budget_contribution } = validationResult.data

    // Get the invitation
    const { data: invitation } = await (supabase as any)
      .from('co_renter_invitations')
      .select('*')
      .eq('id', invitation_id)
      .eq('group_id', groupId)
      .single() as { data: any }

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Verify user is the invitee
    if (invitation.invitee_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only respond to your own invitations' },
        { status: 403 }
      )
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'This invitation has already been responded to' },
        { status: 400 }
      )
    }

    // Update invitation status
    const newStatus = response === 'accept' ? 'accepted' : 'declined'
    await (supabase as any)
      .from('co_renter_invitations')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitation_id)

    // If accepted, add as member
    if (response === 'accept') {
      const { error: memberError } = await (supabase as any)
        .from('co_renter_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member',
          budget_contribution: budget_contribution || null,
        })

      if (memberError) {
        console.error('Error adding member:', memberError)
        return NextResponse.json(
          { error: 'Failed to join group' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: response === 'accept' ? 'You have joined the group' : 'Invitation declined',
    })
  } catch (error) {
    console.error('Error in PUT /api/groups/[id]/invitations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
