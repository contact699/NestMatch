import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const createInvitationSchema = z.object({
  invitee_id: z.string().uuid(),
})

const respondInvitationSchema = z.object({
  invitation_id: z.string().uuid(),
  response: z.enum(['accept', 'decline']),
  budget_contribution: z.number().positive().optional(),
})

// Get invitations for a group
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const groupId = params.id

    // Verify user is a member
    const { data: membership } = await (supabase as any)
      .from('co_renter_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single()

    if (!membership) {
      throw new AuthorizationError('Access denied')
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
      .order('created_at', { ascending: false })

    if (error) throw error

    return apiResponse({ invitations: invitations || [] }, 200, requestId)
  }
)

// Send an invitation (admin only)
export const POST = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const groupId = params.id

    // Verify user is admin
    const { data: membership } = await (supabase as any)
      .from('co_renter_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single()

    if (!membership || membership.role !== 'admin') {
      throw new AuthorizationError('Only admins can send invitations')
    }

    // Validate input
    let body: z.infer<typeof createInvitationSchema>
    try {
      body = await parseBody(req, createInvitationSchema)
    } catch {
      throw new ValidationError('Invalid invitation data')
    }

    const { invitee_id } = body

    // Check if invitee exists
    const { data: invitee } = await (supabase as any)
      .from('profiles')
      .select('user_id')
      .eq('user_id', invitee_id)
      .single()

    if (!invitee) {
      throw new NotFoundError('User not found')
    }

    // Check if invitee is already a member
    const { data: existingMember } = await (supabase as any)
      .from('co_renter_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', invitee_id)
      .single()

    if (existingMember) {
      return apiResponse({ error: 'User is already a member of this group' }, 400, requestId)
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await (supabase as any)
      .from('co_renter_invitations')
      .select('id')
      .eq('group_id', groupId)
      .eq('invitee_id', invitee_id)
      .eq('status', 'pending')
      .single()

    if (existingInvitation) {
      return apiResponse({ error: 'A pending invitation already exists for this user' }, 400, requestId)
    }

    // Create invitation
    const { data: invitation, error: inviteError } = await (supabase as any)
      .from('co_renter_invitations')
      .insert({
        group_id: groupId,
        inviter_id: userId,
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

    if (inviteError) throw inviteError

    return apiResponse({ invitation }, 201, requestId)
  },
  {
    rateLimit: 'invitationSend',
    audit: {
      action: 'create',
      resourceType: 'co_renter_invitation',
      getResourceId: (_req, res) => res?.invitation?.id,
    },
  }
)

// Respond to an invitation (accept/decline)
export const PUT = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const groupId = params.id

    // Validate input
    let body: z.infer<typeof respondInvitationSchema>
    try {
      body = await parseBody(req, respondInvitationSchema)
    } catch {
      throw new ValidationError('Invalid response data')
    }

    const { invitation_id, response, budget_contribution } = body

    // Get the invitation
    const { data: invitation } = await (supabase as any)
      .from('co_renter_invitations')
      .select('*')
      .eq('id', invitation_id)
      .eq('group_id', groupId)
      .single()

    if (!invitation) {
      throw new NotFoundError('Invitation not found')
    }

    // Verify user is the invitee
    if (invitation.invitee_id !== userId) {
      throw new AuthorizationError('You can only respond to your own invitations')
    }

    if (invitation.status !== 'pending') {
      return apiResponse({ error: 'This invitation has already been responded to' }, 400, requestId)
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
          user_id: userId,
          role: 'member',
          budget_contribution: budget_contribution || null,
        })

      if (memberError) throw memberError
    }

    return apiResponse({
      success: true,
      message: response === 'accept' ? 'You have joined the group' : 'Invitation declined',
    }, 200, requestId)
  },
  {
    audit: {
      action: 'update',
      resourceType: 'co_renter_invitation',
    },
  }
)
