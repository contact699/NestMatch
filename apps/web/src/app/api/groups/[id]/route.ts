import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'
import { createServiceClient } from '@/lib/supabase/service'

const updateGroupSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  combined_budget_min: z.number().positive().optional(),
  combined_budget_max: z.number().positive().optional(),
  target_move_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  preferred_cities: z.array(z.string()).optional(),
  status: z.enum(['forming', 'searching', 'matched']).optional(),
}).refine(
  (data) => {
    if (data.combined_budget_min && data.combined_budget_max) {
      return data.combined_budget_min <= data.combined_budget_max
    }
    return true
  },
  { message: 'Minimum budget must be less than or equal to maximum budget', path: ['combined_budget_max'] }
)

// Get a specific group
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id } = params

    // Use service client to bypass co_renter_members RLS infinite recursion
    const readClient = (() => {
      try { return createServiceClient() } catch { return supabase }
    })()

    const { data: group, error } = await readClient
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
      throw new NotFoundError('Group not found')
    }

    // Verify user is a member
    const isMember = group.members?.some((m: any) => m.user?.user_id === userId!)
    if (!isMember) {
      throw new AuthorizationError('Access denied')
    }

    const userMember = group.members?.find((m: any) => m.user?.user_id === userId!)

    return apiResponse({
      group: {
        ...group,
        user_role: userMember?.role || 'member',
        is_admin: userMember?.role === 'admin',
      },
    }, 200, requestId)
  },
  { rateLimit: 'default' }
)

// Update a group (admin only)
export const PUT = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id } = params

    const writeClient = (() => {
      try { return createServiceClient() } catch { return supabase }
    })()

    // Check if user is admin of the group
    const { data: membership } = await writeClient
      .from('co_renter_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', userId!)
      .single()

    if (!membership || membership.role !== 'admin') {
      throw new AuthorizationError('Only admins can update the group')
    }

    // Validate input
    let updateInput: z.infer<typeof updateGroupSchema>
    try {
      updateInput = await parseBody(req, updateGroupSchema)
    } catch {
      throw new ValidationError('Invalid group data')
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    const allowedFields = [
      'name', 'description', 'combined_budget_min', 'combined_budget_max',
      'target_move_date', 'preferred_cities', 'status'
    ]

    for (const field of allowedFields) {
      if (updateInput[field as keyof typeof updateInput] !== undefined) {
        updateData[field] = updateInput[field as keyof typeof updateInput]
      }
    }

    const { data: group, error: updateError } = await writeClient
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

    if (updateError) throw updateError

    return apiResponse({ group }, 200, requestId)
  },
  {
    rateLimit: 'default',
    audit: {
      action: 'update',
      resourceType: 'co_renter_group',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)

// Delete a group (admin only)
export const DELETE = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id } = params

    const deleteClient = (() => {
      try { return createServiceClient() } catch { return supabase }
    })()

    // Check if user is admin of the group
    const { data: membership } = await deleteClient
      .from('co_renter_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', userId!)
      .single()

    if (!membership || membership.role !== 'admin') {
      throw new AuthorizationError('Only admins can delete the group')
    }

    // Delete in order: invitations, members, then group
    await deleteClient
      .from('co_renter_invitations')
      .delete()
      .eq('group_id', id)

    await deleteClient
      .from('co_renter_members')
      .delete()
      .eq('group_id', id)

    const { error: deleteError } = await deleteClient
      .from('co_renter_groups')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return apiResponse({ success: true }, 200, requestId)
  },
  {
    rateLimit: 'default',
    audit: {
      action: 'delete',
      resourceType: 'co_renter_group',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)
