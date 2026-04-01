import { withApiHandler, apiResponse, NotFoundError } from '@/lib/api/with-handler'
import { getOrCreateCustomer, createVerificationCheckoutSession } from '@/lib/services/stripe'
import { getProduct, getCheckTypes, isCheckType, isPackageType, type VerificationProductType } from '@/lib/verification-pricing'

export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const body = await req.json()
    const type = body.type as string
    const forUserId = body.for_user_id as string | undefined

    // Validate product type
    if (!type || (!isCheckType(type) && !isPackageType(type))) {
      return apiResponse({ error: 'Invalid verification type' }, 400, requestId)
    }

    const product = getProduct(type as VerificationProductType)
    if (!product) {
      return apiResponse({ error: 'Product not found' }, 400, requestId)
    }

    // Determine who the checks are for (self or another user)
    const subjectUserId = forUserId || userId!
    const payingUserId = userId!

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

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(payingUserId, payerProfile.email, payerProfile.name || undefined)

    // Build success/cancel URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const successUrl = `${appUrl}/api/verify/checkout/complete?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${appUrl}/verify`

    // Create checkout session
    const session = await createVerificationCheckoutSession({
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
