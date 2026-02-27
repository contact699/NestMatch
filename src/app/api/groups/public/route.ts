import { NextRequest } from 'next/server'
import { withApiHandler, apiResponse } from '@/lib/api/with-handler'
import { createServiceClient } from '@/lib/supabase/service'

// Get public co-renter groups (excluding groups the user is already in)
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Use service client to bypass co_renter_members RLS infinite recursion.
    // Auth is already verified by withApiHandler; access control is enforced in code.
    const readClient = (() => {
      try {
        return createServiceClient()
      } catch {
        return supabase
      }
    })()

    // Get groups where user is already a member, so we can exclude them
    const { data: memberships, error: memberError } = await readClient
      .from('co_renter_members')
      .select('group_id')
      .eq('user_id', userId!)
      .eq('status', 'active')

    if (memberError) throw memberError

    const userGroupIds = (memberships || []).map((m: any) => m.group_id)

    // Fetch public groups that are forming
    let query = readClient
      .from('co_renter_groups')
      .select(`
        *,
        members:co_renter_members(
          user:profiles(name, profile_photo, verification_level)
        )
      `)
      .eq('is_public', true)
      .eq('status', 'forming')

    // Exclude groups the user is already in
    if (userGroupIds.length > 0) {
      query = query.not('id', 'in', `(${userGroupIds.join(',')})`)
    }

    query = query.order('created_at', { ascending: false }).limit(20)

    const { data: groups, error } = await query

    if (error) throw error

    // Enrich with member count
    const enrichedGroups = (groups || []).map((g: any) => ({
      ...g,
      member_count: g.members?.length || 0,
    }))

    return apiResponse({ groups: enrichedGroups }, 200, requestId)
  }
)
