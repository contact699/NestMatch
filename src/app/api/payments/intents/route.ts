import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody, NotFoundError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'
import {
  createPaymentIntent,
  getOrCreateCustomer,
  getPaymentIntent,
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

export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    if (!userId) {
      return apiResponse({ error: 'Unauthorized' }, 401, requestId)
    }

    // Validate input
    let intentData: z.infer<typeof createIntentSchema>
    try {
      intentData = await parseBody(req, createIntentSchema)
    } catch {
      throw new ValidationError('Invalid payment data')
    }

    const { amount, recipient_id, listing_id, payment_method_id, type, description } = intentData

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

    // Get recipient's Connect account if paying to another user
    let recipientConnectAccountId: string | undefined
    if (recipient_id) {
      const { data: payoutAccount } = await (supabase as any)
        .from('payout_accounts')
        .select('stripe_connect_account_id, charges_enabled')
        .eq('user_id', recipient_id)
        .single()

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
        payer_id: userId,
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
        payer_id: userId,
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

    if (paymentError) throw paymentError

    return apiResponse({
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      status: paymentIntent.status,
      payment_id: payment?.id,
    }, 200, requestId)
  },
  {
    rateLimit: 'paymentCreate',
    audit: {
      action: 'create',
      resourceType: 'payment_intent',
      getResourceId: (_req, res) => res?.payment_id,
    },
  }
)

// Get payment intent status
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const { searchParams } = new URL(req.url)
    const paymentIntentId = searchParams.get('payment_intent_id')

    if (!paymentIntentId) {
      return apiResponse({ error: 'payment_intent_id is required' }, 400, requestId)
    }

    // Verify user owns this payment
    const { data: payment } = await (supabase as any)
      .from('payments')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single()

    if (!payment || (payment.payer_id !== userId && payment.recipient_id !== userId)) {
      throw new NotFoundError('Payment not found')
    }

    const paymentIntent = await getPaymentIntent(paymentIntentId)

    return apiResponse({
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      payment,
    }, 200, requestId)
  }
)
