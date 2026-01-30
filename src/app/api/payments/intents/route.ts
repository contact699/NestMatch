import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import {
  createPaymentIntent,
  getOrCreateCustomer,
  getPaymentIntent,
  confirmPaymentIntent,
  cancelPaymentIntent,
  calculatePlatformFee,
} from '@/lib/services/stripe'

const createIntentSchema = z.object({
  amount: z.number().positive(),
  recipient_id: z.string().uuid().optional(),
  listing_id: z.string().uuid().optional(),
  payment_method_id: z.string().optional(),
  type: z.enum(['rent', 'deposit', 'utility', 'service', 'featured_listing']),
  description: z.string().optional(),
})

export async function POST(request: NextRequest) {
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

    const body = await request.json()

    // Validate input
    const validationResult = createIntentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { amount, recipient_id, listing_id, payment_method_id, type, description } = validationResult.data

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

    // Get recipient's Connect account if paying to another user
    let recipientConnectAccountId: string | undefined
    if (recipient_id) {
      const { data: payoutAccount } = await (supabase as any)
        .from('payout_accounts')
        .select('stripe_connect_account_id, charges_enabled')
        .eq('user_id', recipient_id)
        .single() as { data: any }

      if (payoutAccount?.charges_enabled) {
        recipientConnectAccountId = payoutAccount.stripe_connect_account_id
      }
    }

    // Create payment intent
    const paymentIntent = await createPaymentIntent({
      amount,
      customerId: customer.id,
      paymentMethodId: payment_method_id,
      recipientConnectAccountId,
      description: description || `NestMatch ${type} payment`,
      metadata: {
        payer_id: user.id,
        recipient_id: recipient_id || '',
        listing_id: listing_id || '',
        payment_type: type,
      },
    })

    // Create payment record in database
    const platformFee = recipientConnectAccountId ? calculatePlatformFee(amount) : 0

    const { data: payment, error: paymentError } = await (supabase as any)
      .from('payments')
      .insert({
        payer_id: user.id,
        recipient_id: recipient_id || null,
        listing_id: listing_id || null,
        amount,
        platform_fee: platformFee,
        currency: 'CAD',
        type,
        status: 'pending',
        description,
        stripe_payment_intent_id: paymentIntent.id,
        metadata: {
          stripe_customer_id: customer.id,
        },
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment record:', paymentError)
    }

    return NextResponse.json({
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      status: paymentIntent.status,
      payment_id: payment?.id,
    })
  } catch (error) {
    console.error('Error in POST /api/payments/intents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get payment intent status
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

    const { searchParams } = new URL(request.url)
    const paymentIntentId = searchParams.get('payment_intent_id')

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'payment_intent_id is required' },
        { status: 400 }
      )
    }

    // Verify user owns this payment
    const { data: payment } = await (supabase as any)
      .from('payments')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single() as { data: any }

    if (!payment || (payment.payer_id !== user.id && payment.recipient_id !== user.id)) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    const paymentIntent = await getPaymentIntent(paymentIntentId)

    return NextResponse.json({
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      payment,
    })
  } catch (error) {
    console.error('Error in GET /api/payments/intents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
