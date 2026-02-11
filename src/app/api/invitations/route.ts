import { NextRequest } from 'next/server'
import { withApiHandler, apiResponse } from '@/lib/api/with-handler'

// Get user's pending invitations (across all groups)
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const { data: invitations, error } = await supabase
      .from('co_renter_invitations')
      .select(`
        *,
        inviter:profiles!co_renter_invitations_inviter_id_fkey(
          user_id,
          name,
          profile_photo
        ),
        group:co_renter_groups(
          id,
          name,
          description,
          combined_budget_min,
          combined_budget_max,
          target_move_date,
          preferred_cities,
          status,
          members:co_renter_members(
            id,
            user:profiles(
              user_id,
              name,
              profile_photo
            )
          )
        )
      `)
      .eq('invitee_id', userId!)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error

    return apiResponse({ invitations: invitations || [] }, 200, requestId)
  },
  { rateLimit: 'default' }
)
