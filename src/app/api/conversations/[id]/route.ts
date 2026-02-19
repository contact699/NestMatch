import { NextRequest } from 'next/server'
import { withApiHandler, apiResponse, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'

export const GET = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { id } = params

    // Get conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(`
        *,
        listings (
          id,
          title,
          photos,
          price,
          city,
          province
        )
      `)
      .eq('id', id)
      .single()

    if (error || !conversation) {
      throw new NotFoundError('Conversation not found')
    }

    // Check if user is a participant
    if (!conversation.participant_ids || !conversation.participant_ids.includes(userId!)) {
      throw new AuthorizationError('Forbidden - not a participant')
    }

    // Get other participant's profile
    const otherParticipantId = conversation.participant_ids.find(
      (pid: string) => pid !== userId!
    )

    let otherProfile = null
    if (otherParticipantId) {
      // Try with is_online first (requires migration), fall back without it
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, name, profile_photo, verification_level, bio, is_online')
        .eq('user_id', otherParticipantId)
        .single()

      if (profileError && profileError.message?.includes('is_online')) {
        // is_online column doesn't exist yet — retry without it
        const { data: fallbackProfile } = await supabase
          .from('profiles')
          .select('id, user_id, name, profile_photo, verification_level, bio')
          .eq('user_id', otherParticipantId)
          .single()
        otherProfile = fallbackProfile
      } else {
        otherProfile = profile
      }
    }

    return apiResponse({
      conversation: {
        ...conversation,
        other_profile: otherProfile,
      },
    }, 200, requestId)
  },
  { rateLimit: 'default' }
)
