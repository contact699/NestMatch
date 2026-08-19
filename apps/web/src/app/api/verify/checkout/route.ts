import Stripe from 'stripe'
import { withApiHandler, apiResponse, NotFoundError } from '@/lib/api/with-handler'
import { ExternalServiceError } from '@/lib/error-reporter'
import { getOrCreateCustomer, createVerificationCheckoutSession } from '@/lib/services/stripe'
import { getProduct, getCheckTypes, isCheckType, isPackageType, type VerificationProductType } from '@/lib/verification-pricing'

export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return apiResponse({ error: 'Invalid JSON body' }, 400, requestId)
    }

    const type = body?.type

    // Validate product type
    if (typeof type !== 'string' || (!isCheckType(type) && !isPackageType(type))) {
      return apiResponse({ error: 'Invalid verification type' }, 400, requestId)
    }

    const product = getProduct(type as VerificationProductType)
    if (!product) {
      return apiResponse({ error: 'Product not found' }, 400, requestId)
    }

    // Verification is always for the authenticated caller. This used to accept a
    // `for_user_id` from the body and stamp it into the session metadata as
    // `subject_user_id`, which the Stripe webhook and the completion route both
    // trust — so any caller could pay $15 to attach background-check records to
    // a stranger's profile. The subject is the payer, full stop.
    const payingUserId = userId!
    const subjectUserId = userId!

    // Get paying user's profile for Stripe customer
    const { data: payerProfile } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('user_id', payingUserId)
      .single()

    if (!payerProfile) {
      throw new NotFoundError('Profile not found')
    }

    // Check for existing completed/pending verifications
    const checkTypes = getCheckTypes(type as VerificationProductType)
    const { data: existing } = await supabase
      .from('verifications')
      .select('type, status')
      .eq('user_id', subjectUserId)
      .in('type', checkTypes)
      .in('status', ['pending', 'completed'])

    const alreadyDone = new Set((existing || []).map(v => v.type))
    const checksNeeded = checkTypes.filter(t => !alreadyDone.has(t))

    if (checksNeeded.length === 0) {
      return apiResponse({ error: 'All selected verifications are already completed or in progress' }, 409, requestId)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) {
      throw new Error('NEXT_PUBLIC_APP_URL is not configured')
    }
    const successUrl = `${appUrl}/api/verify/checkout/complete?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${appUrl}/verify`

    let session: Awaited<ReturnType<typeof createVerificationCheckoutSession>>
    try {
      const customer = await getOrCreateCustomer(supabase, payingUserId, payerProfile.email, payerProfile.name || undefined)
      session = await createVerificationCheckoutSession({
        customerId: customer.id,
        productName: product.name,
        priceInCents: product.price,
        metadata: {
          verification_type: type,
          subject_user_id: subjectUserId,
          paid_by: payingUserId,
          checks_needed: JSON.stringify(checksNeeded),
        },
        successUrl,
        cancelUrl,
      })
    } catch (err) {
      if (err instanceof Stripe.errors.StripeError) {
        throw new ExternalServiceError('Stripe', err.message)
      }
      throw err
    }

    return apiResponse({ url: session.url }, 200, requestId)
  },
  {
    rateLimit: 'paymentCreate',
    audit: {
      action: 'verification_start',
      resourceType: 'verification_checkout',
    },
  }
)
