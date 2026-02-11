import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const voteSchema = z.object({
  type: z.enum(['resource', 'faq']),
  itemId: z.string().uuid(),
  voteType: z.enum(['helpful', 'not_helpful']).nullable(),
})

export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Validate input
    let body: z.infer<typeof voteSchema>
    try {
      body = await parseBody(req, voteSchema)
    } catch {
      throw new ValidationError('Invalid vote data')
    }

    const { type, itemId, voteType } = body

    const columnName = type === 'resource' ? 'resource_id' : 'faq_id'
    const tableName = type === 'resource' ? 'resources' : 'faqs'

    // Check for existing vote
    const { data: existingVote } = await supabase
      .from('resource_votes')
      .select('*')
      .eq('user_id', userId!)
      .eq(columnName, itemId)
      .single()

    if (voteType === null) {
      // Remove vote
      if (existingVote) {
        await supabase
          .from('resource_votes')
          .delete()
          .eq('id', existingVote.id)

        // Update count
        const decrementField = existingVote.vote_type === 'helpful' ? 'helpful_count' : 'not_helpful_count'
        const { data: item } = await supabase
          .from(tableName)
          .select(decrementField)
          .eq('id', itemId)
          .single() as { data: any }

        if (item) {
          await supabase
            .from(tableName)
            .update({ [decrementField]: Math.max(0, item[decrementField] - 1) } as any)
            .eq('id', itemId)
        }
      }

      return apiResponse({ vote: null }, 200, requestId)
    }

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Same vote, do nothing
        return apiResponse({ vote: existingVote }, 200, requestId)
      }

      // Change vote
      const { data: vote, error } = await supabase
        .from('resource_votes')
        .update({ vote_type: voteType })
        .eq('id', existingVote.id)
        .select()
        .single()

      if (error) throw error

      // Update counts
      const { data: item } = await supabase
        .from(tableName)
        .select('helpful_count, not_helpful_count')
        .eq('id', itemId)
        .single() as { data: any }

      if (item) {
        const updates: any = {}
        if (voteType === 'helpful') {
          updates.helpful_count = item.helpful_count + 1
          updates.not_helpful_count = Math.max(0, item.not_helpful_count - 1)
        } else {
          updates.helpful_count = Math.max(0, item.helpful_count - 1)
          updates.not_helpful_count = item.not_helpful_count + 1
        }
        await supabase
          .from(tableName)
          .update(updates as any)
          .eq('id', itemId)
      }

      return apiResponse({ vote }, 200, requestId)
    }

    // Create new vote
    const insertData: any = {
      user_id: userId!,
      vote_type: voteType,
      [columnName]: itemId,
    }

    const { data: vote, error } = await supabase
      .from('resource_votes')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    // Update count
    const incrementField = voteType === 'helpful' ? 'helpful_count' : 'not_helpful_count'
    const { data: item } = await supabase
      .from(tableName)
      .select(incrementField)
      .eq('id', itemId)
      .single() as { data: any }

    if (item) {
      await supabase
        .from(tableName)
        .update({ [incrementField]: item[incrementField] + 1 } as any)
        .eq('id', itemId)
    }

    return apiResponse({ vote }, 201, requestId)
  },
  { rateLimit: 'default' }
)
