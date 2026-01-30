import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createPaymentIntent,
  getOrCreateCustomer,
  calculatePlatformFee,
} from '@/lib/services/stripe'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Pay for an expense share
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: expenseId } = await params
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
      .single() as { data: any }

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    // Get user's share
    const { data: share } = await (supabase as any)
      .from('expense_shares')
      .select('*')
      .eq('expense_id', expenseId)
      .eq('user_id', user.id)
      .single() as { data: any }

    if (!share) {
      return NextResponse.json(
        { error: 'You do not have a share in this expense' },
        { status: 403 }
      )
    }

    if (share.status === 'paid') {
      return NextResponse.json(
        { error: 'This share has already been paid' },
        { status: 400 }
      )
    }

    // Get payer profile
    const { data: payerProfile } = await (supabase as any)
      .from('profiles')
      .select('email, name')
      .eq('user_id', user.id)
      .single() as { data: any }

    if (!payerProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(
      user.id,
      payerProfile.email,
      payerProfile.name
    )

    // Check if creator has a Connect account for direct payment
    let recipientConnectAccountId: string | undefined
    if (expense.created_by !== user.id) {
      const { data: payoutAccount } = await (supabase as any)
        .from('payout_accounts')
        .select('stripe_connect_account_id, charges_enabled')
        .eq('user_id', expense.created_by)
        .single() as { data: any }

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
        payer_id: user.id,
        recipient_id: expense.created_by,
      },
    })

    // Create payment record
    const platformFee = recipientConnectAccountId ? calculatePlatformFee(share.amount) : 0

    const { data: payment } = await (supabase as any)
      .from('payments')
      .insert({
        payer_id: user.id,
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

    return NextResponse.json({
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: share.amount,
      payment_id: payment?.id,
    })
  } catch (error) {
    console.error('Error in POST /api/expenses/[id]/pay:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
