import { NextRequest } from 'next/server'
import { withApiHandler, apiResponse } from '@/lib/api/with-handler'
import { logger } from '@/lib/logger'
import {
  getConnectAccount,
  createConnectLoginLink,
  getConnectAccountBalance,
} from '@/lib/services/stripe'

// Get Connect account status
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Get payout account from database
    const { data: payoutAccount } = await supabase
      .from('payout_accounts')
      .select('*')
      .eq('user_id', userId!)
      .single()

    if (!payoutAccount) {
      return apiResponse({
        status: 'not_created',
        message: 'No payout account found. Start onboarding to receive payments.',
      }, 200, requestId)
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
      await supabase
        .from('payout_accounts')
        .update({
          status: newStatus,
          charges_enabled: stripeAccount.charges_enabled,
          payouts_enabled: stripeAccount.payouts_enabled,
          details_submitted: stripeAccount.details_submitted,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId!)
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
        logger.warn('Error fetching balance', { requestId, error: (e as Error).message })
      }
    }

    // Get dashboard link if active
    let dashboardLink = null
    if (stripeAccount.details_submitted) {
      try {
        const loginLink = await createConnectLoginLink(payoutAccount.stripe_connect_account_id)
        dashboardLink = loginLink.url
      } catch (e) {
        logger.warn('Error creating login link', { requestId, error: (e as Error).message })
      }
    }

    // Get payment stats
    const { data: paymentStats } = await supabase
      .from('payments')
      .select('amount, status')
      .eq('recipient_id', userId!)

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

    return apiResponse({
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
    }, 200, requestId)
  },
  { rateLimit: 'paymentCreate' }
)
