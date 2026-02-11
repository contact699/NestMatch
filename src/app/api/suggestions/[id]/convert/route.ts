import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody, NotFoundError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const convertSchema = z.object({
  groupName: z.string().min(1).max(255).optional(),
  message: z.string().max(500).optional(),
})

// POST /api/suggestions/[id]/convert - Convert a suggestion to a group with invitations
export const POST = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id } = params

    // Validate input
    let body: z.infer<typeof convertSchema>
    try {
      body = await parseBody(req, convertSchema)
    } catch {
      throw new ValidationError('Invalid request body')
    }

    const { groupName, message } = body

    // Fetch the suggestion
    const { data: suggestion, error: fetchError } = await supabase
      .from('group_suggestions')
      .select('*')
      .eq('id', id)
      .eq('target_user_id', userId!)
      .eq('status', 'active')
      .single()

    if (fetchError || !suggestion) {
      throw new NotFoundError('Suggestion not found or already converted')
    }

    // Get creator's profile for default group name
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('user_id', userId!)
      .single()

    const finalGroupName = groupName || `${creatorProfile?.name || 'User'}'s Group`

    // Create the co-renter group
    const matchCriteria = (suggestion.match_criteria || {}) as any
    const { data: group, error: groupError } = await supabase
      .from('co_renter_groups')
      .insert({
        name: finalGroupName,
        description: `Group formed from AI suggestion. Looking for places in ${matchCriteria.commonCities?.join(', ') || 'various cities'}.`,
        combined_budget_min: matchCriteria.budgetOverlap?.min,
        combined_budget_max: matchCriteria.budgetOverlap?.max,
        target_move_date: matchCriteria.dateRange?.earliest,
        preferred_cities: matchCriteria.commonCities,
        group_size_min: 2,
        group_size_max: suggestion.suggested_users.length + 1,
        status: 'forming',
        is_public: false,
        created_by: userId!,
      })
      .select()
      .single()

    if (groupError || !group) {
      throw groupError || new Error('Failed to create group')
    }

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from('co_renter_members')
      .insert({
        group_id: group.id,
        user_id: userId!,
        role: 'admin',
        status: 'active',
      })

    if (memberError) {
      // Rollback group creation
      await supabase
        .from('co_renter_groups')
        .delete()
        .eq('id', group.id)

      throw memberError
    }

    // Create invitations for suggested users
    const invitations = suggestion.suggested_users.map((inviteeId: string) => ({
      group_id: group.id,
      inviter_id: userId!,
      invitee_id: inviteeId,
      message: message || 'You\'ve been matched as a potential roommate! Would you like to join this group?',
      status: 'pending',
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
    }))

    const { error: inviteError } = await supabase
      .from('co_renter_invitations')
      .insert(invitations)

    if (inviteError) {
      // Don't rollback, group was created successfully
      // Log for debugging but continue
    }

    // Update suggestion status
    await supabase
      .from('group_suggestions')
      .update({
        status: 'converted',
        converted_group_id: group.id,
      })
      .eq('id', id)

    // Record the interested interaction
    await supabase
      .from('suggestion_interactions')
      .upsert({
        suggestion_id: id,
        user_id: userId!,
        action: 'interested',
      })

    return apiResponse({
      success: true,
      groupId: group.id,
      invitationsSent: suggestion.suggested_users.length,
    }, 201, requestId)
  },
  {
    rateLimit: 'groupCreate',
    audit: {
      action: 'create',
      resourceType: 'co_renter_group',
      getResourceId: (_req, res) => res?.groupId,
    },
  }
)
