import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'

const statusSchema = z.object({
  is_online: z.boolean(),
})

/**
 * Summary of the signed-in user's own profile. Used by pages that need to show
 * "you" in a sidebar (name/photo/member-since) without pulling the full
 * profile record.
 */
export const GET = withApiHandler(
  async (_req, { userId, supabase, requestId }) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('user_id, name, profile_photo, verification_level, created_at, is_online, last_seen_at')
      .eq('user_id', userId!)
      .maybeSingle()

    if (error) throw error

    return apiResponse({ profile: profile ?? null }, 200, requestId)
  },
  { rateLimit: 'api' }
)

export const PUT = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const { is_online } = await parseBody(req, statusSchema)

    const { error } = await supabase
      .from('profiles')
      .update({
        is_online,
        last_seen_at: is_online ? null : new Date().toISOString(),
      })
      .eq('user_id', userId!)

    if (error) throw error

    return apiResponse({ is_online }, 200, requestId)
  },
  { rateLimit: 'api' }
)
