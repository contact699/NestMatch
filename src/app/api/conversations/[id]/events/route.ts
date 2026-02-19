import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { NotFoundError, AuthorizationError } from '@/lib/error-reporter'

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  location: z.string().max(500).optional(),
})

const updateEventSchema = z.object({
  status: z.enum(['accepted', 'declined', 'cancelled']),
  event_id: z.string().uuid(),
})

export const GET = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const conversationId = params?.id
    if (!conversationId) throw new NotFoundError('Conversation')

    const { data: conv } = await supabase
      .from('conversations')
      .select('participant_ids')
      .eq('id', conversationId)
      .single()

    if (!conv?.participant_ids?.includes(userId!)) {
      throw new AuthorizationError('Not a participant')
    }

    const { data: events, error } = await supabase
      .from('chat_events')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('event_date', { ascending: true })

    if (error) throw error

    return apiResponse({ events: events || [] }, 200, requestId)
  },
  { rateLimit: 'api' }
)

export const POST = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const conversationId = params?.id
    if (!conversationId) throw new NotFoundError('Conversation')

    const { data: conv } = await supabase
      .from('conversations')
      .select('participant_ids')
      .eq('id', conversationId)
      .single()

    if (!conv?.participant_ids?.includes(userId!)) {
      throw new AuthorizationError('Not a participant')
    }

    const eventData = await parseBody(req, eventSchema)

    const { data: event, error } = await supabase
      .from('chat_events')
      .insert({
        conversation_id: conversationId,
        created_by: userId!,
        ...eventData,
      })
      .select()
      .single()

    if (error) throw error

    return apiResponse({ event }, 201, requestId)
  },
  { rateLimit: 'api' }
)

export const PUT = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const conversationId = params?.id
    if (!conversationId) throw new NotFoundError('Conversation')

    const { data: conv } = await supabase
      .from('conversations')
      .select('participant_ids')
      .eq('id', conversationId)
      .single()

    if (!conv?.participant_ids?.includes(userId!)) {
      throw new AuthorizationError('Not a participant')
    }

    const { event_id, status } = await parseBody(req, updateEventSchema)

    const { data: event, error } = await supabase
      .from('chat_events')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', event_id)
      .eq('conversation_id', conversationId)
      .select()
      .single()

    if (error) throw error

    return apiResponse({ event }, 200, requestId)
  },
  { rateLimit: 'api' }
)
