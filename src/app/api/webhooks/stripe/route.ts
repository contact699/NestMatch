import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { constructWebhookEvent } from '@/lib/services/stripe'
import type Stripe from 'stripe'

// Lazy initialization of Supabase admin client
let _supabase: ReturnType<typeof createClient> | null = null

function getSupabaseAdmin() {
  if (!_supabase) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment variables not set')
    }
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  }
  return _supabase
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = constructWebhookEvent(body, signature)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent)
        break

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge)
        break

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account)
        break

      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id)

  // Update payment record
  const { error } = await (getSupabaseAdmin() as any)
    .from('payments')
    .update({
      status: 'completed',
      stripe_charge_id: paymentIntent.latest_charge as string,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (error) {
    console.error('Error updating payment:', error)
  }

  // TODO: Send notification to payer and recipient
  // TODO: Update any related records (cohabitation, expense shares, etc.)
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id)

  const { error } = await (getSupabaseAdmin() as any)
    .from('payments')
    .update({
      status: 'failed',
      metadata: {
        failure_code: paymentIntent.last_payment_error?.code,
        failure_message: paymentIntent.last_payment_error?.message,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (error) {
    console.error('Error updating payment:', error)
  }

  // TODO: Send notification to payer about failed payment
}

async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment canceled:', paymentIntent.id)

  const { error } = await (getSupabaseAdmin() as any)
    .from('payments')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (error) {
    console.error('Error updating payment:', error)
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log('Charge refunded:', charge.id)

  // Find payment by charge ID or payment intent ID
  const { error } = await (getSupabaseAdmin() as any)
    .from('payments')
    .update({
      status: charge.refunded ? 'refunded' : 'completed',
      refunded_at: charge.refunded ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_charge_id', charge.id)

  if (error) {
    console.error('Error updating payment for refund:', error)
  }

  // TODO: Send notification about refund
}

async function handleAccountUpdated(account: Stripe.Account) {
  console.log('Account updated:', account.id)

  const status = account.charges_enabled ? 'active' :
                 account.details_submitted ? 'restricted' : 'pending'

  const { error } = await (getSupabaseAdmin() as any)
    .from('payout_accounts')
    .update({
      status,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_connect_account_id', account.id)

  if (error) {
    console.error('Error updating payout account:', error)
  }

  // TODO: Send notification if account status changed
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  console.log('Transfer created:', transfer.id)

  // Update payment with transfer ID if metadata contains payment info
  if (transfer.metadata?.payment_id) {
    const { error } = await (getSupabaseAdmin() as any)
      .from('payments')
      .update({
        stripe_transfer_id: transfer.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transfer.metadata.payment_id)

    if (error) {
      console.error('Error updating payment with transfer:', error)
    }
  }
}

// Disable body parsing for webhook (we need raw body for signature verification)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
