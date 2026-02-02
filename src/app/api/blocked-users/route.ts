import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const blockSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
})

export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Get blocked users with profile info
    const { data: blockedUsers, error } = await (supabase as any)
      .from('blocked_users')
      .select(`
        id,
        blocked_user_id,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Fetch profiles for blocked users
    const blockedUserIds = (blockedUsers || []).map((b: any) => b.blocked_user_id)

    let profiles: any[] = []
    if (blockedUserIds.length > 0) {
      const { data: profileData } = await (supabase as any)
        .from('profiles')
        .select('user_id, name, profile_photo')
        .in('user_id', blockedUserIds)
      profiles = profileData || []
    }

    // Combine data
    const blockedWithProfiles = (blockedUsers || []).map((b: any) => ({
      ...b,
      profile: profiles.find((p) => p.user_id === b.blocked_user_id) || null,
    }))

    return apiResponse({ blocked_users: blockedWithProfiles }, 200, requestId)
  }
)

export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Validate input
    let body: z.infer<typeof blockSchema>
    try {
      body = await parseBody(req, blockSchema)
    } catch {
      throw new ValidationError('user_id is required')
    }

    const blockedUserId = body.user_id

    if (blockedUserId === userId) {
      return apiResponse({ error: 'Cannot block yourself' }, 400, requestId)
    }

    // Check if already blocked
    const { data: existing } = await (supabase as any)
      .from('blocked_users')
      .select('id')
      .eq('user_id', userId)
      .eq('blocked_user_id', blockedUserId)
      .single()

    if (existing) {
      return apiResponse({ error: 'User already blocked' }, 409, requestId)
    }

    // Block user
    const { data: blocked, error } = await (supabase as any)
      .from('blocked_users')
      .insert({
        user_id: userId,
        blocked_user_id: blockedUserId,
      })
      .select()
      .single()

    if (error) throw error

    return apiResponse({ blocked }, 201, requestId)
  },
  {
    rateLimit: 'default',
    audit: {
      action: 'create',
      resourceType: 'blocked_user',
      getResourceId: (_req, res) => res?.blocked?.id,
    },
  }
)
