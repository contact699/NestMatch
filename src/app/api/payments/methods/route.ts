import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import {
  getOrCreateCustomer,
  createSetupIntent,
  listPaymentMethods,
  attachPaymentMethod,
  detachPaymentMethod,
  setDefaultPaymentMethod,
} from '@/lib/services/stripe'

// Get payment methods and setup intent
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

    // Get user profile
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('email, name')
      .eq('user_id', user.id)
      .single() as { data: any }

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(user.id, profile.email, profile.name)

    // Get payment methods from Stripe
    const stripePaymentMethods = await listPaymentMethods(customer.id)

    // Get local payment method records
    const { data: localMethods } = await (supabase as any)
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }) as { data: any[] }

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

    return NextResponse.json({
      payment_methods: paymentMethods,
      setup_intent: {
        client_secret: setupIntent.client_secret,
      },
      customer_id: customer.id,
    })
  } catch (error) {
    console.error('Error in GET /api/payments/methods:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

const addMethodSchema = z.object({
  payment_method_id: z.string(),
  set_as_default: z.boolean().optional(),
})

// Add a payment method
export async function POST(request: NextRequest) {
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

    const body = await request.json()

    const validationResult = addMethodSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { payment_method_id, set_as_default } = validationResult.data

    // Get user profile
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('email, name')
      .eq('user_id', user.id)
      .single() as { data: any }

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(user.id, profile.email, profile.name)

    // Attach payment method to customer
    const paymentMethod = await attachPaymentMethod(payment_method_id, customer.id)

    // If setting as default, update Stripe and local records
    if (set_as_default) {
      await setDefaultPaymentMethod(customer.id, payment_method_id)

      // Update all existing methods to not default
      await (supabase as any)
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id)
    }

    // Save to local database
    const { data: savedMethod, error: saveError } = await (supabase as any)
      .from('payment_methods')
      .insert({
        user_id: user.id,
        stripe_payment_method_id: payment_method_id,
        type: paymentMethod.type,
        last_four: paymentMethod.card?.last4 || null,
        brand: paymentMethod.card?.brand || null,
        exp_month: paymentMethod.card?.exp_month || null,
        exp_year: paymentMethod.card?.exp_year || null,
        is_default: set_as_default || false,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving payment method:', saveError)
    }

    return NextResponse.json({
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
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/payments/methods:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

const deleteMethodSchema = z.object({
  payment_method_id: z.string(),
})

// Remove a payment method
export async function DELETE(request: NextRequest) {
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

    const body = await request.json()

    const validationResult = deleteMethodSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { payment_method_id } = validationResult.data

    // Verify user owns this payment method
    const { data: localMethod } = await (supabase as any)
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .eq('stripe_payment_method_id', payment_method_id)
      .single() as { data: any }

    if (!localMethod) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      )
    }

    // Detach from Stripe
    await detachPaymentMethod(payment_method_id)

    // Delete from local database
    await (supabase as any)
      .from('payment_methods')
      .delete()
      .eq('stripe_payment_method_id', payment_method_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/payments/methods:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
