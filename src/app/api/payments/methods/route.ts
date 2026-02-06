import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody, NotFoundError } from '@/lib/api/with-handler'
import { ValidationError } from '@/lib/error-reporter'
import {
  getOrCreateCustomer,
  createSetupIntent,
  listPaymentMethods,
  attachPaymentMethod,
  detachPaymentMethod,
  setDefaultPaymentMethod,
} from '@/lib/services/stripe'

const addMethodSchema = z.object({
  payment_method_id: z.string(),
  set_as_default: z.boolean().optional(),
})

const deleteMethodSchema = z.object({
  payment_method_id: z.string(),
})

// Get payment methods and setup intent
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    if (!userId) {
      return apiResponse({ error: 'Unauthorized' }, 401, requestId)
    }

    // Get user profile
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('email, name')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      throw new NotFoundError('Profile not found')
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(userId, profile.email, profile.name)

    // Get payment methods from Stripe
    const stripePaymentMethods = await listPaymentMethods(customer.id)

    // Get local payment method records
    const { data: localMethods } = await (supabase as any)
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Create a setup intent for adding new payment methods
    const setupIntent = await createSetupIntent(customer.id)

    // Format payment methods
    const paymentMethods = stripePaymentMethods.map((pm) => {
      const localMethod = localMethods?.find(
        (lm: any) => lm.stripe_payment_method_id === pm.id
      )
      return {
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year,
        } : null,
        is_default: localMethod?.is_default || false,
        created_at: localMethod?.created_at || new Date().toISOString(),
      }
    })

    return apiResponse({
      payment_methods: paymentMethods,
      setup_intent: {
        client_secret: setupIntent.client_secret,
      },
      customer_id: customer.id,
    }, 200, requestId)
  }
)

// Add a payment method
export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    if (!userId) {
      return apiResponse({ error: 'Unauthorized' }, 401, requestId)
    }

    // Validate input
    let body: z.infer<typeof addMethodSchema>
    try {
      body = await parseBody(req, addMethodSchema)
    } catch {
      throw new ValidationError('Invalid payment method data')
    }

    const { payment_method_id, set_as_default } = body

    // Get user profile
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('email, name')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      throw new NotFoundError('Profile not found')
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(userId, profile.email, profile.name)

    // Attach payment method to customer
    const paymentMethod = await attachPaymentMethod(payment_method_id, customer.id)

    // If setting as default, update Stripe and local records
    if (set_as_default) {
      await setDefaultPaymentMethod(customer.id, payment_method_id)

      // Update all existing methods to not default
      await (supabase as any)
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', userId)
    }

    // Save to local database
    await (supabase as any)
      .from('payment_methods')
      .insert({
        user_id: userId,
        stripe_payment_method_id: payment_method_id,
        type: paymentMethod.type,
        last_four: paymentMethod.card?.last4 || null,
        brand: paymentMethod.card?.brand || null,
        exp_month: paymentMethod.card?.exp_month || null,
        exp_year: paymentMethod.card?.exp_year || null,
        is_default: set_as_default || false,
      })

    return apiResponse({
      payment_method: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          exp_month: paymentMethod.card.exp_month,
          exp_year: paymentMethod.card.exp_year,
        } : null,
        is_default: set_as_default || false,
      },
    }, 201, requestId)
  },
  {
    audit: {
      action: 'create',
      resourceType: 'payment_method',
    },
  }
)

// Remove a payment method
export const DELETE = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    if (!userId) {
      return apiResponse({ error: 'Unauthorized' }, 401, requestId)
    }

    // Validate input
    let body: z.infer<typeof deleteMethodSchema>
    try {
      body = await parseBody(req, deleteMethodSchema)
    } catch {
      throw new ValidationError('payment_method_id is required')
    }

    const { payment_method_id } = body

    // Verify user owns this payment method
    const { data: localMethod } = await (supabase as any)
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .eq('stripe_payment_method_id', payment_method_id)
      .single()

    if (!localMethod) {
      throw new NotFoundError('Payment method not found')
    }

    // Detach from Stripe
    await detachPaymentMethod(payment_method_id)

    // Delete from local database
    await (supabase as any)
      .from('payment_methods')
      .delete()
      .eq('stripe_payment_method_id', payment_method_id)

    return apiResponse({ success: true }, 200, requestId)
  },
  {
    audit: {
      action: 'delete',
      resourceType: 'payment_method',
    },
  }
)
