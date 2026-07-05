import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'
import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'

const createRequestSchema = z.object({
  message: z.string().max(500).optional(),
})

const respondSchema = z.object({
  request_id: z.string().uuid(),
  response: z.enum(['accepted', 'declined']),
})

// List pending join requests for a group (group admins only). Powers the
// admin approve/decline section on the group detail page.
export const GET = withApiHandler(
  async (_req, { userId, supabase, requestId, params }) => {
    const groupId = params.id
    const svcClient = (() => {
      try { return createServiceClient() } catch { return supabase }
    })()

    // Verify the caller is an admin of the group.
    const { data: membership } = await svcClient
      .from('co_renter_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId!)
      .single()

    if (!membership || membership.role !== 'admin') {
      throw new AuthorizationError('Only admins can view join requests')
    }

    const { data: requests, error } = await svcClient
      .from('co_renter_join_requests')
      .select('id, user_id, message, status, created_at')
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Enrich with requester profiles (no FK relationship is defined on the
    // join_requests table, so join manually instead of a nested select).
    const userIds = (requests ?? []).map((r) => r.user_id)
    let profilesById: Record<string, { user_id: string; name: string | null; profile_photo: string | null }> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await svcClient
        .from('profiles')
        .select('user_id, name, profile_photo')
        .in('user_id', userIds)
      profilesById = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]))
    }

    const join_requests = (requests ?? []).map((r) => ({
      ...r,
      requester: profilesById[r.user_id] ?? null,
    }))

    return apiResponse({ join_requests }, 200, requestId)
  },
  { rateLimit: 'default' }
)

// Create a join request (a user wants to join a public group).
export const POST = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const groupId = params.id
    const svcClient = (() => {
      try { return createServiceClient() } catch { return supabase }
    })()

    // Verify group exists and is public.
    const { data: group, error: groupError } = await svcClient
      .from('co_renter_groups')
      .select('id, is_public')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      throw new NotFoundError('Group not found')
    }

    if (!group.is_public) {
      throw new AuthorizationError('This group is not accepting join requests')
    }

    // Already a member?
    const { data: existingMember } = await svcClient
      .from('co_renter_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId!)
      .maybeSingle()

    if (existingMember) {
      return apiResponse({ error: 'You are already a member of this group' }, 400, requestId)
    }

    // Already have a request?
    const { data: existingRequest } = await svcClient
      .from('co_renter_join_requests')
      .select('id, status')
      .eq('group_id', groupId)
      .eq('user_id', userId!)
      .maybeSingle()

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return apiResponse({ error: 'You already have a pending request for this group' }, 400, requestId)
      }
      if (existingRequest.status === 'declined') {
        return apiResponse({ error: 'Your request to join this group was declined' }, 400, requestId)
      }
    }

    // Optional message.
    let body: z.infer<typeof createRequestSchema> = {}
    try {
      body = await parseBody(req, createRequestSchema)
    } catch {
      // Message is optional; ignore parse errors.
    }

    // A stale 'accepted' request can remain after the user left/was removed
    // from the group (UNIQUE(group_id, user_id) blocks a fresh insert), so
    // reset that row back to pending instead of inserting.
    let joinRequest: { id: string; status: string; created_at: string }
    if (existingRequest) {
      const { data: reopened, error: updateError } = await svcClient
        .from('co_renter_join_requests')
        .update({
          status: 'pending',
          message: body.message || null,
          reviewed_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRequest.id)
        .select('id, status, created_at')
        .single()

      if (updateError) throw updateError
      joinRequest = reopened
    } else {
      const { data: created, error: insertError } = await svcClient
        .from('co_renter_join_requests')
        .insert({
          group_id: groupId,
          user_id: userId!,
          message: body.message || null,
        })
        .select('id, status, created_at')
        .single()

      if (insertError) throw insertError
      joinRequest = created
    }

    // Notify each group admin about the new request.
    const { data: requesterProfile } = await svcClient
      .from('profiles')
      .select('name')
      .eq('user_id', userId!)
      .single()

    const { data: groupInfo } = await svcClient
      .from('co_renter_groups')
      .select('name')
      .eq('id', groupId)
      .single()

    const { data: admins } = await svcClient
      .from('co_renter_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('role', 'admin')
      .eq('status', 'active')

    if (admins && admins.length > 0) {
      const { error: notifyError } = await svcClient.from('notifications').insert(
        admins.map((admin) => ({
          user_id: admin.user_id,
          type: 'join_request_received',
          title: 'New join request',
          body: `${requesterProfile?.name || 'Someone'} wants to join ${groupInfo?.name || 'your group'}`,
          link: `/groups/${groupId}`,
          metadata: { group_id: groupId, request_id: joinRequest.id, requester_id: userId },
        }))
      )
      if (notifyError) {
        logger.warn('Failed to notify admins of join request', {
          requestId,
          groupId,
          error: notifyError.message,
        })
      }
    }

    return apiResponse({ join_request: joinRequest }, 201, requestId)
  },
  { rateLimit: 'default' }
)

// Respond to a join request (group admin accepts or declines).
export const PUT = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const groupId = params.id
    const svcClient = (() => {
      try { return createServiceClient() } catch { return supabase }
    })()

    // Only group admins may respond.
    const { data: membership } = await svcClient
      .from('co_renter_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId!)
      .single()

    if (!membership || membership.role !== 'admin') {
      throw new AuthorizationError('Only admins can respond to join requests')
    }

    let body: z.infer<typeof respondSchema>
    try {
      body = await parseBody(req, respondSchema)
    } catch {
      throw new ValidationError('Invalid request data')
    }

    const { data: joinRequest, error: fetchError } = await svcClient
      .from('co_renter_join_requests')
      .select('id, user_id, status')
      .eq('id', body.request_id)
      .eq('group_id', groupId)
      .single()

    if (fetchError || !joinRequest) {
      throw new NotFoundError('Join request not found')
    }

    if (joinRequest.status !== 'pending') {
      return apiResponse({ error: 'This request has already been responded to' }, 400, requestId)
    }

    const { error: updateError } = await svcClient
      .from('co_renter_join_requests')
      .update({
        status: body.response,
        reviewed_by: userId!,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.request_id)

    if (updateError) throw updateError

    // On accept, add the requester as a member.
    if (body.response === 'accepted') {
      const { error: memberError } = await svcClient
        .from('co_renter_members')
        .insert({
          group_id: groupId,
          user_id: joinRequest.user_id,
          role: 'member',
          status: 'active',
        })

      if (memberError) throw memberError
    }

    // Notify the requester of the decision.
    const { data: groupInfo } = await svcClient
      .from('co_renter_groups')
      .select('name')
      .eq('id', groupId)
      .single()

    const { createNotification, createNotificationsForGroupMembers } = await import('@/lib/notifications')

    const notifType = body.response === 'accepted' ? 'join_request_accepted' as const : 'join_request_declined' as const
    const notifTitle = body.response === 'accepted' ? 'Join request accepted!' : 'Join request declined'
    const notifBody = body.response === 'accepted'
      ? `You've been accepted into ${groupInfo?.name || 'a group'}`
      : `Your request to join ${groupInfo?.name || 'a group'} was declined`

    await createNotification({
      userId: joinRequest.user_id,
      type: notifType,
      title: notifTitle,
      body: notifBody,
      link: `/groups/${groupId}`,
      metadata: { group_id: groupId, request_id: body.request_id },
    })

    // On accept, also notify existing members about the new member.
    if (body.response === 'accepted') {
      const { data: newMemberProfile } = await svcClient
        .from('profiles')
        .select('name')
        .eq('user_id', joinRequest.user_id)
        .single()

      await createNotificationsForGroupMembers(groupId, joinRequest.user_id, {
        type: 'member_joined',
        title: 'New group member',
        body: `${newMemberProfile?.name || 'Someone'} joined ${groupInfo?.name || 'your group'}`,
        link: `/groups/${groupId}`,
        metadata: { group_id: groupId, new_member_id: joinRequest.user_id },
      })
    }

    return apiResponse({ success: true }, 200, requestId)
  },
  { rateLimit: 'default' }
)
