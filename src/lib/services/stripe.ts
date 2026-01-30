import Stripe from 'stripe'

// Lazy initialization of Stripe to avoid errors during build
let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
    })
  }
  return _stripe
}

// Platform fee percentage (e.g., 5%)
const PLATFORM_FEE_PERCENT = 5

/**
 * Calculate platform fee for a given amount
 */
export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * (PLATFORM_FEE_PERCENT / 100) * 100) / 100
}

/**
 * Convert CAD amount to cents for Stripe
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

/**
 * Convert cents back to CAD dollars
 */
export function fromCents(cents: number): number {
  return cents / 100
}

// ============================================
// STRIPE CONNECT (For providers to receive payments)
// ============================================

/**
 * Create a Stripe Connect Express account for a provider
 */
export async function createConnectAccount(
  email: string,
  userId: string
): Promise<Stripe.Account> {
  const account = await getStripe().accounts.create({
    type: 'express',
    country: 'CA',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    metadata: {
      nestmatch_user_id: userId,
    },
  })

  return account
}

/**
 * Create an account link for Connect onboarding
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  const accountLink = await getStripe().accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  })

  return accountLink
}

/**
 * Get Connect account details
 */
export async function getConnectAccount(
  accountId: string
): Promise<Stripe.Account> {
  return getStripe().accounts.retrieve(accountId)
}

/**
 * Create a login link for the Connect dashboard
 */
export async function createConnectLoginLink(
  accountId: string
): Promise<Stripe.LoginLink> {
  return getStripe().accounts.createLoginLink(accountId)
}

// ============================================
// PAYMENT METHODS (Customer payment methods)
// ============================================

/**
 * Create or retrieve a Stripe customer for a user
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  // Search for existing customer by metadata
  const existingCustomers = await getStripe().customers.search({
    query: `metadata['nestmatch_user_id']:'${userId}'`,
  })

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0]
  }

  // Create new customer
  const customer = await getStripe().customers.create({
    email,
    name: name || undefined,
    metadata: {
      nestmatch_user_id: userId,
    },
  })

  return customer
}

/**
 * Create a SetupIntent for adding a payment method
 */
export async function createSetupIntent(
  customerId: string
): Promise<Stripe.SetupIntent> {
  return getStripe().setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
  })
}

/**
 * List payment methods for a customer
 */
export async function listPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  const paymentMethods = await getStripe().paymentMethods.list({
    customer: customerId,
    type: 'card',
  })

  return paymentMethods.data
}

/**
 * Attach a payment method to a customer
 */
export async function attachPaymentMethod(
  paymentMethodId: string,
  customerId: string
): Promise<Stripe.PaymentMethod> {
  return getStripe().paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  })
}

/**
 * Detach a payment method from customer
 */
export async function detachPaymentMethod(
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  return getStripe().paymentMethods.detach(paymentMethodId)
}

/**
 * Set default payment method for a customer
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Customer> {
  return getStripe().customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  })
}

// ============================================
// PAYMENTS (Processing payments)
// ============================================

interface CreatePaymentIntentParams {
  amount: number // In CAD dollars
  customerId: string
  paymentMethodId?: string
  recipientConnectAccountId?: string // For marketplace payments
  description?: string
  metadata?: Record<string, string>
}

/**
 * Create a payment intent for a transaction
 */
export async function createPaymentIntent({
  amount,
  customerId,
  paymentMethodId,
  recipientConnectAccountId,
  description,
  metadata,
}: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
  const amountInCents = toCents(amount)
  const platformFee = toCents(calculatePlatformFee(amount))

  const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
    amount: amountInCents,
    currency: 'cad',
    customer: customerId,
    description,
    metadata: {
      ...metadata,
      platform_fee_amount: platformFee.toString(),
    },
    automatic_payment_methods: {
      enabled: true,
    },
  }

  // If paying to a provider, use Connect
  if (recipientConnectAccountId) {
    paymentIntentParams.transfer_data = {
      destination: recipientConnectAccountId,
    }
    paymentIntentParams.application_fee_amount = platformFee
  }

  // If specific payment method provided
  if (paymentMethodId) {
    paymentIntentParams.payment_method = paymentMethodId
    paymentIntentParams.confirm = true
    paymentIntentParams.return_url = `${process.env.NEXT_PUBLIC_APP_URL}/payments/complete`
  }

  return getStripe().paymentIntents.create(paymentIntentParams)
}

/**
 * Confirm a payment intent
 */
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId?: string
): Promise<Stripe.PaymentIntent> {
  const params: Stripe.PaymentIntentConfirmParams = {
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments/complete`,
  }

  if (paymentMethodId) {
    params.payment_method = paymentMethodId
  }

  return getStripe().paymentIntents.confirm(paymentIntentId, params)
}

/**
 * Retrieve a payment intent
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  return getStripe().paymentIntents.retrieve(paymentIntentId)
}

/**
 * Cancel a payment intent
 */
export async function cancelPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  return getStripe().paymentIntents.cancel(paymentIntentId)
}

// ============================================
// REFUNDS
// ============================================

interface CreateRefundParams {
  paymentIntentId: string
  amount?: number // Partial refund amount in CAD, or full if not provided
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
}

/**
 * Create a refund for a payment
 */
export async function createRefund({
  paymentIntentId,
  amount,
  reason,
}: CreateRefundParams): Promise<Stripe.Refund> {
  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
    reason,
  }

  if (amount) {
    refundParams.amount = toCents(amount)
  }

  return getStripe().refunds.create(refundParams)
}

// ============================================
// TRANSFERS (Direct transfers to Connect accounts)
// ============================================

/**
 * Create a transfer to a Connect account
 */
export async function createTransfer(
  amount: number,
  connectAccountId: string,
  description?: string,
  metadata?: Record<string, string>
): Promise<Stripe.Transfer> {
  return getStripe().transfers.create({
    amount: toCents(amount),
    currency: 'cad',
    destination: connectAccountId,
    description,
    metadata,
  })
}

// ============================================
// WEBHOOKS
// ============================================

/**
 * Verify and construct webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}

// ============================================
// BALANCE
// ============================================

/**
 * Get platform balance
 */
export async function getPlatformBalance(): Promise<Stripe.Balance> {
  return getStripe().balance.retrieve()
}

/**
 * Get Connect account balance
 */
export async function getConnectAccountBalance(
  connectAccountId: string
): Promise<Stripe.Balance> {
  return getStripe().balance.retrieve({
    stripeAccount: connectAccountId,
  })
}

// Export types for use in API routes
export type {
  Stripe,
}

// Export getStripe for direct access if needed
export { getStripe }
