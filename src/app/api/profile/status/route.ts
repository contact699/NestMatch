import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'

const statusSchema = z.object({
  is_online: z.boolean(),
})

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
