import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const batchSchema = z.object({
  userIds: z.array(z.string().uuid()),
})

export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const { searchParams } = new URL(req.url)
    const otherUserId = searchParams.get('userId')

    if (!otherUserId) {
      return apiResponse({ error: 'userId parameter required' }, 400, requestId)
    }

    // Call the database function to calculate compatibility
    const { data, error } = await supabase.rpc('calculate_compatibility', {
      user_id_1: userId!,
      user_id_2: otherUserId,
    })

    if (error) throw error

    return apiResponse({ score: data || 0 }, 200, requestId)
  },
  { rateLimit: 'default' }
)

// Batch compatibility scores for multiple users
export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    if (!userId) {
      return apiResponse({ error: 'Unauthorized' }, 401, requestId)
    }

    // Validate input
    let body: z.infer<typeof batchSchema>
    try {
      body = await parseBody(req, batchSchema)
    } catch {
      throw new ValidationError('userIds array required')
    }

    const { userIds } = body

    // Filter out the current user from the list
    const otherUserIds = userIds.filter(id => id !== userId!)

    // Initialize scores with self-match
    const scores: Record<string, number> = {}
    if (userIds.includes(userId!)) {
      scores[userId!] = 100 // Perfect match with yourself
    }

    if (otherUserIds.length === 0) {
      return apiResponse({ scores }, 200, requestId)
    }

    // Use batch calculation for efficiency (single DB call instead of N calls)
    const { data, error } = await supabase.rpc('batch_calculate_compatibility', {
      current_user_id: userId!,
      other_user_ids: otherUserIds,
    })

    if (error) {
      // Fallback to individual calculations if batch fails
      for (const otherUserId of otherUserIds) {
        const { data: score } = await supabase.rpc('calculate_compatibility', {
          user_id_1: userId!,
          user_id_2: otherUserId,
        })
        scores[otherUserId] = score || 0
      }
    } else if (data) {
      // Map batch results to scores object
      for (const result of data) {
        scores[result.user_id] = result.score || 0
      }
    }

    return apiResponse({ scores }, 200, requestId)
  },
  { rateLimit: 'search' }
)
