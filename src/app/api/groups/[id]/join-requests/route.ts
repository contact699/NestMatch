import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'
import { createServiceClient } from '@/lib/supabase/service'

const createRequestSchema = z.object({
  message: z.string().max(500).optional(),
})

const respondSchema = z.object({
  request_id: z.string().uuid(),
  response: z.enum(['accepted', 'declined']),
})

// Create a join request (user wants to join a public group)
export const POST = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const groupId = params.id
    const svcClient = (() => {
      try { return createServiceClient() } catch { return supabase }
    })()

    // Verify group exists and is public
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

    // Check if user is already a member
    const { data: existingMember } = await svcClient
      .from('co_renter_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId!)
      .single()

    if (existingMember) {
      return apiResponse({ error: 'You are already a member of this group' }, 400, requestId)
    }

    // Check if user already has a pending request
    const { data: existingRequest } = await (svcClient as any)
      .from('co_renter_join_requests')
      .select('id, status')
      .eq('group_id', groupId)
      .eq('user_id', userId!)
      .single()

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return apiResponse({ error: 'You already have a pending request for this group' }, 400, requestId)
      }
      if (existingRequest.status === 'declined') {
        return apiResponse({ error: 'Your request to join this group was declined' }, 400, requestId)
      }
    }

    // Parse optional message
    let body: z.infer<typeof createRequestSchema> = {}
    try {
      body = await parseBody(req, createRequestSchema)
    } catch {
      // Message is optional, ignore parse errors
    }

    // Create the join request
    const { data: joinRequest, error: insertError } = await (svcClient as any)
      .from('co_renter_join_requests')
      .insert({
        group_id: groupId,
        user_id: userId!,
        message: body.message || null,
      })
      .select('id, status, created_at')
      .single()

    if (insertError) throw insertError

    return apiResponse({ join_request: joinRequest }, 201, requestId)
  },
  { rateLimit: 'default' }
)

// Respond to a join request (admin accepts or declines)
export const PUT = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const groupId = params.id
    const svcClient = (() => {
      try { return createServiceClient() } catch { return supabase }
    })()

    // Verify user is admin of the group
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

    // Fetch the join request
    const { data: joinRequest, error: fetchError } = await (svcClient as any)
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

    // Update the join request status
    const { error: updateError } = await (svcClient as any)
      .from('co_renter_join_requests')
      .update({
        status: body.response,
        reviewed_by: userId!,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.request_id)

    if (updateError) throw updateError

    // If accepted, add user as a member
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

    return apiResponse({ success: true }, 200, requestId)
  },
  { rateLimit: 'default' }
)
