import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const createGroupSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  combined_budget_min: z.number().positive().optional(),
  combined_budget_max: z.number().positive().optional(),
  target_move_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  preferred_cities: z.array(z.string()).optional(),
  budget_contribution: z.number().positive().optional(),
}).refine(
  (data) => {
    if (data.combined_budget_min && data.combined_budget_max) {
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

    const { data: allGroups, error } = await query

    if (error) throw error

    // Filter to only groups where user is a member
    const userGroups = (allGroups || []).filter((group: any) =>
      group.members?.some((m: any) => m.user?.user_id === userId)
    )

    // Add user's role to each group
    const enrichedGroups = userGroups.map((group: any) => {
      const userMember = group.members?.find((m: any) => m.user?.user_id === userId)
      return {
        ...group,
        user_role: userMember?.role || 'member',
        member_count: group.members?.length || 0,
        pending_invitations: group.invitations?.filter((i: any) => i.status === 'pending').length || 0,
      }
    })

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
    } = groupData

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

    if (groupError) throw groupError

    // Add creator as admin member
    const { error: memberError } = await (supabase as any)
      .from('co_renter_members')
      .insert({
        group_id: group.id,
        user_id: userId,
        role: 'admin',
        budget_contribution: groupData.budget_contribution || null,
      })

    if (memberError) {
      // Rollback group creation
      await (supabase as any)
        .from('co_renter_groups')
        .delete()
        .eq('id', group.id)

      throw memberError
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
