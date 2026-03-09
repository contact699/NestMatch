import { withApiHandler, apiResponse } from '@/lib/api/with-handler'

export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    // Get all conversations the user is part of
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .contains('participant_ids', [userId!])

    if (!conversations?.length) {
      return apiResponse({ events: [] }, 200, requestId)
    }

    const conversationIds = conversations.map((c: any) => c.id)

    let query = supabase
      .from('chat_events')
      .select(`
        *,
        conversations (
          id,
          participant_ids
        )
      `)
      .in('conversation_id', conversationIds)

    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
      const endDate = `${year}-${month.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      query = query.gte('event_date', startDate).lte('event_date', endDate)
    }

    const { data: events, error } = await query
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) throw error

    return apiResponse({ events: events || [] }, 200, requestId)
  },
  { rateLimit: 'api' }
)
