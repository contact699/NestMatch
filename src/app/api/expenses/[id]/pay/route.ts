import { NextRequest } from 'next/server'
import { withApiHandler, apiResponse, NotFoundError, AuthorizationError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'
import {
  createPaymentIntent,
  getOrCreateCustomer,
  calculatePlatformFee,
} from '@/lib/services/stripe'

// Pay for an expense share
export const POST = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    if (!userId) {
      return apiResponse({ error: 'Unauthorized' }, 401, requestId)
    }

    const { id: expenseId } = params

    // Get expense and user's share
    const { data: expense } = await (supabase as any)
      .from('shared_expenses')
      .select(`
        *,
        creator:profiles!shared_expenses_created_by_fkey(
          user_id,
          email,
          name
        )
      `)
      .eq('id', expenseId)
      .single()

    if (!expense) {
      throw new NotFoundError('Expense not found')
    }

    // Get user's share
    const { data: share } = await (supabase as any)
      .from('expense_shares')
      .select('*')
      .eq('expense_id', expenseId)
      .eq('user_id', userId)
      .single()

    if (!share) {
      throw new AuthorizationError('You do not have a share in this expense')
    }

    if (share.status === 'paid') {
      throw new ValidationError('This share has already been paid')
    }

    // Get payer profile
    const { data: payerProfile } = await (supabase as any)
      .from('profiles')
      .select('email, name')
      .eq('user_id', userId)
      .single()

    if (!payerProfile) {
      throw new NotFoundError('Profile not found')
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(
      userId,
      payerProfile.email,
      payerProfile.name
    )

    // Check if creator has a Connect account for direct payment
    let recipientConnectAccountId: string | undefined
    if (expense.created_by !== userId) {
      const { data: payoutAccount } = await (supabase as any)
        .from('payout_accounts')
        .select('stripe_connect_account_id, charges_enabled')
        .eq('user_id', expense.created_by)
        .single()

      if (payoutAccount?.charges_enabled) {
        recipientConnectAccountId = payoutAccount.stripe_connect_account_id
      }
    }

    // Create payment intent
    const paymentIntent = await createPaymentIntent({
      amount: share.amount,
      customerId: customer.id,
      recipientConnectAccountId,
      description: `${expense.title} - Bill Split Payment`,
      metadata: {
        expense_id: expenseId,
        share_id: share.id,
        payer_id: userId,
        recipient_id: expense.created_by,
      },
    })

    // Create payment record
    const platformFee = recipientConnectAccountId ? calculatePlatformFee(share.amount) : 0

    const { data: payment } = await (supabase as any)
      .from('payments')
      .insert({
        payer_id: userId,
        recipient_id: expense.created_by,
        listing_id: expense.listing_id,
        amount: share.amount,
        platform_fee: platformFee,
        currency: 'CAD',
        type: 'utility',
        status: 'pending',
        description: `Bill split: ${expense.title}`,
        stripe_payment_intent_id: paymentIntent.id,
        metadata: {
          expense_id: expenseId,
          share_id: share.id,
        },
      })
      .select()
      .single()

    // Update share with payment ID
    await (supabase as any)
      .from('expense_shares')
      .update({
        payment_id: payment?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', share.id)

    return apiResponse({
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: share.amount,
      payment_id: payment?.id,
    }, 200, requestId)
  },
  {
    rateLimit: 'paymentCreate',
    audit: {
      action: 'create',
      resourceType: 'expense_payment',
      getResourceId: (_req, res) => res?.payment_id,
    },
  }
)
