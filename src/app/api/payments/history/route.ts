import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
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
      query = query.eq('payer_id', user.id)
    } else if (type === 'received') {
      query = query.eq('recipient_id', user.id)
    } else {
      // All payments involving the user
      query = query.or(`payer_id.eq.${user.id},recipient_id.eq.${user.id}`)
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status)
    }

    // Order and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: payments, error, count } = await query as { data: any[]; error: any; count: number }

    if (error) {
      console.error('Error fetching payments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch payment history' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = (supabase as any)
      .from('payments')
      .select('*', { count: 'exact', head: true })

    if (type === 'sent') {
      countQuery = countQuery.eq('payer_id', user.id)
    } else if (type === 'received') {
      countQuery = countQuery.eq('recipient_id', user.id)
    } else {
      countQuery = countQuery.or(`payer_id.eq.${user.id},recipient_id.eq.${user.id}`)
    }

    if (status) {
      countQuery = countQuery.eq('status', status)
    }

    const { count: totalCount } = await countQuery as { count: number }

    // Calculate summary stats
    const summary = {
      total_sent: 0,
      total_received: 0,
      pending_sent: 0,
      pending_received: 0,
    }

    if (payments) {
      for (const payment of payments) {
        if (payment.payer_id === user.id && payment.status === 'completed') {
          summary.total_sent += payment.amount
        }
        if (payment.recipient_id === user.id && payment.status === 'completed') {
          summary.total_received += payment.amount
        }
        if (payment.payer_id === user.id && payment.status === 'pending') {
          summary.pending_sent += payment.amount
        }
        if (payment.recipient_id === user.id && payment.status === 'pending') {
          summary.pending_received += payment.amount
        }
      }
    }

    return NextResponse.json({
      payments: payments || [],
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        has_more: (offset + limit) < (totalCount || 0),
      },
      summary,
    })
  } catch (error) {
    console.error('Error in GET /api/payments/history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
