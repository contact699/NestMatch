import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody, NotFoundError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'

const interactSchema = z.object({
  action: z.enum(['viewed', 'interested', 'dismissed']),
})

// POST /api/suggestions/[id]/interact - Record an interaction with a suggestion
export const POST = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id } = params

    // Validate input
    let body: z.infer<typeof interactSchema>
    try {
      body = await parseBody(req, interactSchema)
    } catch {
      throw new ValidationError('Invalid request body')
    }

    const { action } = body

    // Verify the suggestion exists and belongs to user
    const { data: suggestion, error: fetchError } = await (supabase as any)
      .from('group_suggestions')
      .select('id, status')
      .eq('id', id)
      .eq('target_user_id', userId)
      .single()

    if (fetchError || !suggestion) {
      throw new NotFoundError('Suggestion not found')
    }

    // Record the interaction
    const { error: insertError } = await (supabase as any)
      .from('suggestion_interactions')
      .upsert(
        {
          suggestion_id: id,
          user_id: userId,
          action,
        },
        {
          onConflict: 'suggestion_id,user_id,action',
        }
      )

    if (insertError) throw insertError

    // If action is dismissed, update suggestion status
    if (action === 'dismissed') {
      await (supabase as any)
        .from('group_suggestions')
        .update({ status: 'dismissed' })
        .eq('id', id)
    }

    return apiResponse({
      success: true,
      action,
    }, 200, requestId)
  },
  {
    audit: {
      action: 'update',
      resourceType: 'suggestion_interaction',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)
