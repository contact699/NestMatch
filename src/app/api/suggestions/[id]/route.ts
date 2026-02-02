import { NextRequest } from 'next/server'
import { withApiHandler, apiResponse, NotFoundError } from '@/lib/api/with-handler'

// GET /api/suggestions/[id] - Get a specific suggestion
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id } = params

    const { data: suggestion, error } = await (supabase as any)
      .from('group_suggestions')
      .select('*')
      .eq('id', id)
      .eq('target_user_id', userId)
      .single()

    if (error || !suggestion) {
      throw new NotFoundError('Suggestion not found')
    }

    // Fetch profiles for suggested users
    const allUserIds = [userId, ...suggestion.suggested_users]
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('user_id, name, profile_photo, verification_level, city, province, bio')
      .in('user_id', allUserIds)

    return apiResponse({
      suggestion: {
        ...suggestion,
        memberProfiles: profiles || [],
      },
    }, 200, requestId)
  }
)

// DELETE /api/suggestions/[id] - Dismiss a suggestion
export const DELETE = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id } = params

    // Update suggestion status to dismissed
    const { error } = await (supabase as any)
      .from('group_suggestions')
      .update({ status: 'dismissed' })
      .eq('id', id)
      .eq('target_user_id', userId)

    if (error) throw error

    // Record the interaction
    await (supabase as any)
      .from('suggestion_interactions')
      .upsert({
        suggestion_id: id,
        user_id: userId,
        action: 'dismissed',
      })

    return apiResponse({ success: true }, 200, requestId)
  },
  {
    audit: {
      action: 'dismiss',
      resourceType: 'group_suggestion',
      getResourceId: (_req, _res, params) => params?.id,
    },
  }
)
