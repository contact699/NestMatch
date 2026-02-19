import { withApiHandler, apiResponse } from '@/lib/api/with-handler'

export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Get all conversations the user is part of
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .contains('participant_ids', [userId!])

    if (!conversations?.length) {
      return apiResponse({ events: [] }, 200, requestId)
    }

    const conversationIds = conversations.map((c: any) => c.id)

    const { data: events, error } = await supabase
      .from('chat_events')
      .select(`
        *,
        conversations (
          id,
          participant_ids
        )
      `)
      .in('conversation_id', conversationIds)
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) throw error

    return apiResponse({ events: events || [] }, 200, requestId)
  },
  { rateLimit: 'api' }
)
