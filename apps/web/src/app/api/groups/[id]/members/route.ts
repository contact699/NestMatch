import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'
import { createServiceClient } from '@/lib/supabase/service'

const updateMemberSchema = z.object({
  member_id: z.string().uuid(),
  budget_contribution: z.number().positive().optional(),
  role: z.enum(['admin', 'member']).optional(),
})

const removeMemberSchema = z.object({
  member_id: z.string().uuid(),
})

// Update a member's details (admin only, or self for budget)
export const PUT = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const groupId = params.id
    const svcClient = (() => {
      try { return createServiceClient() } catch { return supabase }
    })()

    // Validate input
    let body: z.infer<typeof updateMemberSchema>
    try {
      body = await parseBody(req, updateMemberSchema)
    } catch {
      throw new ValidationError('Invalid member data')
    }

    const { member_id, budget_contribution, role } = body

    // Get current user's membership
    const { data: currentMember } = await svcClient
      .from('co_renter_members')
      .select('role, user_id')
      .eq('group_id', groupId)
      .eq('user_id', userId!)
      .single()

    if (!currentMember) {
      throw new AuthorizationError('You are not a member of this group')
    }

    // Get target member
    const { data: targetMember } = await svcClient
      .from('co_renter_members')
      .select('*')
      .eq('id', member_id)
      .eq('group_id', groupId)
      .single()

    if (!targetMember) {
      throw new NotFoundError('Member not found')
    }

    const isAdmin = currentMember.role === 'admin'
    const isSelf = targetMember.user_id === userId!

    // Check permissions
    if (role && !isAdmin) {
      throw new AuthorizationError('Only admins can change member roles')
    }

    if (budget_contribution !== undefined && !isAdmin && !isSelf) {
      throw new AuthorizationError('You can only update your own budget contribution')
    }

    // Build update data
    const updateData: Record<string, any> = {}

    if (budget_contribution !== undefined) {
      updateData.budget_contribution = budget_contribution
    }

    if (role !== undefined && isAdmin) {
      // Prevent removing the last admin
      if (role === 'member' && targetMember.role === 'admin') {
        const { data: admins } = await svcClient
          .from('co_renter_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('role', 'admin')

        if (admins?.length === 1) {
          return apiResponse(
            { error: 'Cannot remove the last admin. Promote another member first.' },
            400,
            requestId
          )
        }
      }
      updateData.role = role
    }

    const { data: member, error: updateError } = await svcClient
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

    if (updateError) throw updateError

    return apiResponse({ member }, 200, requestId)
  },
  {
    rateLimit: 'default',
    audit: {
      action: 'update',
      resourceType: 'co_renter_member',
    },
  }
)

// Remove a member (admin only, or self to leave)
export const DELETE = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const groupId = params.id
    const svcClient = (() => {
      try { return createServiceClient() } catch { return supabase }
    })()

    // Validate input
    let body: z.infer<typeof removeMemberSchema>
    try {
      body = await parseBody(req, removeMemberSchema)
    } catch {
      throw new ValidationError('member_id is required')
    }

    const { member_id } = body

    // Get current user's membership
    const { data: currentMember } = await svcClient
      .from('co_renter_members')
      .select('role, user_id')
      .eq('group_id', groupId)
      .eq('user_id', userId!)
      .single()

    if (!currentMember) {
      throw new AuthorizationError('You are not a member of this group')
    }

    // Get target member
    const { data: targetMember } = await svcClient
      .from('co_renter_members')
      .select('*')
      .eq('id', member_id)
      .eq('group_id', groupId)
      .single()

    if (!targetMember) {
      throw new NotFoundError('Member not found')
    }

    const isAdmin = currentMember.role === 'admin'
    const isSelf = targetMember.user_id === userId!

    // Check permissions
    if (!isAdmin && !isSelf) {
      throw new AuthorizationError('Only admins can remove other members')
    }

    // Prevent removing the last admin (unless leaving)
    if (targetMember.role === 'admin') {
      const { data: admins } = await svcClient
        .from('co_renter_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('role', 'admin')

      if (admins?.length === 1) {
        // Check if there are other members to promote
        const { data: otherMembers } = await svcClient
          .from('co_renter_members')
          .select('id')
          .eq('group_id', groupId)
          .neq('id', member_id)

        if (otherMembers && otherMembers.length > 0) {
          return apiResponse(
            { error: 'Cannot leave as the last admin. Promote another member first or delete the group.' },
            400,
            requestId
          )
        }
      }
    }

    const { error: deleteError } = await svcClient
      .from('co_renter_members')
      .delete()
      .eq('id', member_id)

    if (deleteError) throw deleteError

    return apiResponse({
      success: true,
      message: isSelf ? 'You have left the group' : 'Member removed from group',
    }, 200, requestId)
  },
  {
    rateLimit: 'default',
    audit: {
      action: 'delete',
      resourceType: 'co_renter_member',
    },
  }
)
