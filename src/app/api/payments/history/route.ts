import { NextRequest } from 'next/server'
import { withApiHandler, apiResponse } from '@/lib/api/with-handler'

export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'sent', 'received', or 'all'
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query based on type
    let query = (supabase as any)
      .from('payments')
      .select(`
        *,
        payer:profiles!payments_payer_id_fkey(
          name,
          profile_photo
        ),
        recipient:profiles!payments_recipient_id_fkey(
          name,
          profile_photo
        ),
        listing:listings(
          id,
          title,
          city
        )
      `)

    // Filter by type
    if (type === 'sent') {
      query = query.eq('payer_id', userId)
    } else if (type === 'received') {
      query = query.eq('recipient_id', userId)
    } else {
      // All payments involving the user
      query = query.or(`payer_id.eq.${userId},recipient_id.eq.${userId}`)
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status)
    }

    // Order and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: payments, error } = await query

    if (error) throw error

    // Get total count for pagination
    let countQuery = (supabase as any)
      .from('payments')
      .select('*', { count: 'exact', head: true })

    if (type === 'sent') {
      countQuery = countQuery.eq('payer_id', userId)
    } else if (type === 'received') {
      countQuery = countQuery.eq('recipient_id', userId)
    } else {
      countQuery = countQuery.or(`payer_id.eq.${userId},recipient_id.eq.${userId}`)
    }

    if (status) {
      countQuery = countQuery.eq('status', status)
    }

    const { count: totalCount } = await countQuery

    // Calculate summary stats
    const summary = {
      total_sent: 0,
      total_received: 0,
      pending_sent: 0,
      pending_received: 0,
    }

    if (payments) {
      for (const payment of payments) {
        if (payment.payer_id === userId && payment.status === 'completed') {
          summary.total_sent += payment.amount
        }
        if (payment.recipient_id === userId && payment.status === 'completed') {
          summary.total_received += payment.amount
        }
        if (payment.payer_id === userId && payment.status === 'pending') {
          summary.pending_sent += payment.amount
        }
        if (payment.recipient_id === userId && payment.status === 'pending') {
          summary.pending_received += payment.amount
        }
      }
    }

    return apiResponse({
      payments: payments || [],
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        has_more: (offset + limit) < (totalCount || 0),
      },
      summary,
    }, 200, requestId)
  }
)
