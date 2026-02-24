import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { constructWebhookEvent } from '@/lib/services/stripe'
import { withWebhookHandler, apiResponse, getWebhookBody } from '@/lib/api/with-handler'
import { logger } from '@/lib/logger'
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

// We need raw body for signature verification, so we handle this specially
export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header', requestId },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    let event: Stripe.Event

    try {
      event = constructWebhookEvent(body, signature)
    } catch (err: any) {
      logger.error('Webhook signature verification failed', err, { requestId })
      return NextResponse.json(
        { error: 'Webhook signature verification failed', requestId },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    // Log the event
    logger.info(`Stripe webhook received: ${event.type}`, {
      requestId,
      action: 'webhook',
      resource: 'stripe',
      resourceId: event.id,
    })

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, requestId)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, requestId)
        break

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent, requestId)
        break

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge, requestId)
        break

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account, requestId)
        break

      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer, requestId)
        break

      default:
        logger.info(`Unhandled Stripe event type: ${event.type}`, { requestId })
    }

    return NextResponse.json(
      { received: true, requestId },
      { status: 200, headers: { 'X-Request-ID': requestId } }
    )
  } catch (error) {
    logger.error('Error processing Stripe webhook', error as Error, { requestId })
    return NextResponse.json(
      { error: 'Webhook processing failed', requestId },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, requestId: string) {
  logger.info('Payment succeeded', { requestId, resourceId: paymentIntent.id })

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
    logger.error('Error updating payment', error, { requestId, resourceId: paymentIntent.id })
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent, requestId: string) {
  logger.info('Payment failed', { requestId, resourceId: paymentIntent.id })

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
    logger.error('Error updating failed payment', error, { requestId, resourceId: paymentIntent.id })
  }
}

async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent, requestId: string) {
  logger.info('Payment canceled', { requestId, resourceId: paymentIntent.id })

  const { error } = await (getSupabaseAdmin() as any)
    .from('payments')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (error) {
    logger.error('Error updating canceled payment', error, { requestId, resourceId: paymentIntent.id })
  }
}

async function handleChargeRefunded(charge: Stripe.Charge, requestId: string) {
  logger.info('Charge refunded', { requestId, resourceId: charge.id })

  const { error } = await (getSupabaseAdmin() as any)
    .from('payments')
    .update({
      status: charge.refunded ? 'refunded' : 'completed',
      refunded_at: charge.refunded ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_charge_id', charge.id)

  if (error) {
    logger.error('Error updating refunded payment', error, { requestId, resourceId: charge.id })
  }
}

async function handleAccountUpdated(account: Stripe.Account, requestId: string) {
  logger.info('Connect account updated', { requestId, resourceId: account.id })

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
    logger.error('Error updating payout account', error, { requestId, resourceId: account.id })
  }
}

async function handleTransferCreated(transfer: Stripe.Transfer, requestId: string) {
  logger.info('Transfer created', { requestId, resourceId: transfer.id })

  if (transfer.metadata?.payment_id) {
    const { error } = await (getSupabaseAdmin() as any)
      .from('payments')
      .update({
        stripe_transfer_id: transfer.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transfer.metadata.payment_id)

    if (error) {
      logger.error('Error updating payment with transfer', error, { requestId, resourceId: transfer.id })
    }
  }
}

// Disable body parsing for webhook (we need raw body for signature verification)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
