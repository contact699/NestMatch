import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getConnectAccount,
  createConnectLoginLink,
  getConnectAccountBalance,
} from '@/lib/services/stripe'

// Get Connect account status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

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

    // Get payout account from database
    const { data: payoutAccount } = await (supabase as any)
      .from('payout_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single() as { data: any }

    if (!payoutAccount) {
      return NextResponse.json({
        status: 'not_created',
        message: 'No payout account found. Start onboarding to receive payments.',
      })
    }

    // Get latest status from Stripe
    const stripeAccount = await getConnectAccount(payoutAccount.stripe_connect_account_id)

    // Update local record if status changed
    const newStatus = stripeAccount.charges_enabled ? 'active' :
                      stripeAccount.details_submitted ? 'restricted' : 'pending'

    if (
      payoutAccount.status !== newStatus ||
      payoutAccount.charges_enabled !== stripeAccount.charges_enabled ||
      payoutAccount.payouts_enabled !== stripeAccount.payouts_enabled ||
      payoutAccount.details_submitted !== stripeAccount.details_submitted
    ) {
      await (supabase as any)
        .from('payout_accounts')
        .update({
          status: newStatus,
          charges_enabled: stripeAccount.charges_enabled,
          payouts_enabled: stripeAccount.payouts_enabled,
          details_submitted: stripeAccount.details_submitted,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
    }

    // Get balance if account is active
    let balance = null
    if (stripeAccount.charges_enabled) {
      try {
        const stripeBalance = await getConnectAccountBalance(payoutAccount.stripe_connect_account_id)
        balance = {
          available: stripeBalance.available.map((b) => ({
            currency: b.currency,
            amount: b.amount / 100,
          })),
          pending: stripeBalance.pending.map((b) => ({
            currency: b.currency,
            amount: b.amount / 100,
          })),
        }
      } catch (e) {
        // Balance might not be available yet
        console.error('Error fetching balance:', e)
      }
    }

    // Get dashboard link if active
    let dashboardLink = null
    if (stripeAccount.details_submitted) {
      try {
        const loginLink = await createConnectLoginLink(payoutAccount.stripe_connect_account_id)
        dashboardLink = loginLink.url
      } catch (e) {
        console.error('Error creating login link:', e)
      }
    }

    // Get payment stats
    const { data: paymentStats } = await (supabase as any)
      .from('payments')
      .select('amount, status')
      .eq('recipient_id', user.id) as { data: any[] }

    const stats = {
      total_received: 0,
      total_pending: 0,
      total_transactions: 0,
    }

    if (paymentStats) {
      for (const payment of paymentStats) {
        if (payment.status === 'completed') {
          stats.total_received += payment.amount
        } else if (payment.status === 'pending' || payment.status === 'processing') {
          stats.total_pending += payment.amount
        }
        stats.total_transactions++
      }
    }

    return NextResponse.json({
      status: newStatus,
      account: {
        id: stripeAccount.id,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted,
        requirements: stripeAccount.requirements,
      },
      balance,
      dashboard_link: dashboardLink,
      stats,
    })
  } catch (error) {
    console.error('Error in GET /api/connect/status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
