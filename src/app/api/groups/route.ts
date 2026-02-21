import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'
import { logger } from '@/lib/logger'
import { createServiceClient } from '@/lib/supabase/service'

const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional().nullable(),
  combined_budget_min: z.number().int().positive().max(99999).optional().nullable(),
  combined_budget_max: z.number().int().positive().max(99999).optional().nullable(),
  target_move_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  preferred_cities: z.array(z.string().trim().min(1).max(100)).max(20).optional().nullable(),
  budget_contribution: z.number().int().positive().max(99999).optional().nullable(),
  is_public: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.combined_budget_min != null && data.combined_budget_max != null) {
      return data.combined_budget_min <= data.combined_budget_max
    }
    return true
  },
  { message: 'Minimum budget must be less than or equal to maximum budget', path: ['combined_budget_max'] }
)

// Get user's co-renter groups
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    // Get groups where user is a member
    // First, find group IDs where the user is a member
    const { data: memberships, error: memberError } = await supabase
      .from('co_renter_members')
      .select('group_id, role')
      .eq('user_id', userId!)
      .eq('status', 'active')

    if (memberError) throw memberError

    const groupIds = (memberships || []).map((m: any) => m.group_id)

    if (groupIds.length === 0) {
      return apiResponse({ groups: [] }, 200, requestId)
    }

    // Build role lookup
    const roleByGroupId = new Map(
      (memberships || []).map((m: any) => [m.group_id, m.role])
    )

    // Fetch the groups with members
    let query = supabase
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
        )
      `)
      .in('id', groupIds)

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('created_at', { ascending: false })

    const { data: allGroups, error } = await query

    if (error) throw error

    // Fetch pending invitation counts separately
    const { data: invitationCounts } = await supabase
      .from('co_renter_invitations')
      .select('group_id')
      .in('group_id', groupIds)
      .eq('status', 'pending')

    const pendingByGroup = new Map<string, number>()
    for (const inv of invitationCounts || []) {
      pendingByGroup.set(inv.group_id, (pendingByGroup.get(inv.group_id) || 0) + 1)
    }

    // Enrich groups with role and counts
    const enrichedGroups = (allGroups || []).map((group: any) => ({
      ...group,
      user_role: roleByGroupId.get(group.id) || 'member',
      member_count: group.members?.length || 0,
      pending_invitations: pendingByGroup.get(group.id) || 0,
    }))

    return apiResponse({ groups: enrichedGroups }, 200, requestId)
  }
)

// Create a new co-renter group
export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Validate input
    let groupData: z.infer<typeof createGroupSchema>
    try {
      groupData = await parseBody(req, createGroupSchema)
    } catch {
      throw new ValidationError('Invalid group data')
    }

    const {
      name,
      description,
      combined_budget_min,
      combined_budget_max,
      target_move_date,
      preferred_cities,
      is_public,
    } = groupData

    // Use service role for writes when available to avoid RLS edge cases during bootstrap.
    const writeClient = (() => {
      try {
        return createServiceClient()
      } catch {
        logger.warn('Service client unavailable for group creation; falling back to user-scoped client', {
          requestId,
          userId: userId!,
        })
        return supabase
      }
    })()

    // Create group (include created_by for policy checks and ownership)
    const { data: group, error: groupError } = await writeClient
      .from('co_renter_groups')
      .insert({
        name,
        description: description || null,
        combined_budget_min: combined_budget_min || null,
        combined_budget_max: combined_budget_max || null,
        target_move_date: target_move_date || null,
        preferred_cities: preferred_cities || null,
        status: 'forming',
        is_public,
        group_size_min: 2,
        group_size_max: 5,
        created_by: userId!,
      })
      .select()
      .single()

    if (groupError) {
      logger.error('Group creation error', groupError instanceof Error ? groupError : new Error(String(groupError)))
      throw groupError
    }

    // Add creator as admin member
    const { error: memberError } = await writeClient
      .from('co_renter_members')
      .insert({
        group_id: group.id,
        user_id: userId!,
        role: 'admin',
        status: 'active',
        budget_contribution: groupData.budget_contribution || null,
      })

    if (memberError) {
      logger.error('Member creation error', memberError instanceof Error ? memberError : new Error(String(memberError)))
      // Rollback group creation
      await writeClient
        .from('co_renter_groups')
        .delete()
        .eq('id', group.id)

      throw memberError
    }

    // Fetch complete group with members
    const { data: completeGroup } = await writeClient
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

    return apiResponse({ group: completeGroup }, 201, requestId)
  },
  {
    rateLimit: 'groupCreate',
    audit: {
      action: 'create',
      resourceType: 'co_renter_group',
      getResourceId: (_req, res) => res?.group?.id,
    },
  }
)
