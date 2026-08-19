import { NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/api/with-handler'
import { getCheckoutSession } from '@/lib/services/stripe'
import { initiateVerification } from '@/lib/services/certn'
import { logger } from '@/lib/logger'
import type { VerificationCheckType } from '@/lib/verification-pricing'

export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const sessionId = req.nextUrl.searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.redirect(new URL('/verify?payment=error', req.url))
    }

    // Retrieve and verify the Stripe session
    const session = await getCheckoutSession(sessionId)

    const metadata = session.metadata || {}
    const subjectUserId = metadata.subject_user_id
    const paidBy = metadata.paid_by

    // Ownership check FIRST: a Stripe session id appearing in a redirect URL is
    // not a secret, and this route provisions verifications off it. Without this
    // guard anyone holding (or guessing) someone else's session id could drive
    // that session's checks — and, worse, burn it via the idempotency lookup.
    // Only the user who paid may complete their own session.
    if (!paidBy || paidBy !== userId!) {
      logger.warn('Checkout completion attempted by a user who did not pay', {
        requestId,
        sessionId,
      })
      return NextResponse.redirect(new URL('/verify?payment=error', req.url))
    }

    // Self-only, enforced at consumption time. api/verify/checkout/route.ts now
    // stamps subject_user_id = paid_by = the authenticated caller, but sessions
    // minted BEFORE that patch could name any `for_user_id` as the subject and
    // are still redeemable — a Stripe Checkout Session stays completable long
    // after it is created. Refusing the mismatch here (and in the webhook)
    // retires those without needing to hunt them down in Stripe.
    if (subjectUserId && subjectUserId !== paidBy) {
      logger.error('Rejected checkout session whose subject is not the payer', undefined, {
        requestId,
        sessionId,
      })
      return NextResponse.redirect(new URL('/verify?payment=error', req.url))
    }

    if (session.payment_status !== 'paid') {
      logger.warn('Checkout session not paid', { requestId, sessionId, status: session.payment_status })
      return NextResponse.redirect(new URL('/verify?payment=error', req.url))
    }

    // Metadata is attacker-influenced only via Stripe, but a malformed value
    // here used to throw out of the handler into a bare 500 instead of the
    // /verify error state the rest of this route redirects to.
    let checksNeeded: VerificationCheckType[]
    try {
      const parsed = JSON.parse(metadata.checks_needed || '[]')
      checksNeeded = Array.isArray(parsed) ? (parsed as VerificationCheckType[]) : []
    } catch {
      logger.error('Unparseable checks_needed in checkout metadata', undefined, {
        requestId,
        sessionId,
      })
      return NextResponse.redirect(new URL('/verify?payment=error', req.url))
    }

    if (!subjectUserId || checksNeeded.length === 0) {
      logger.error('Invalid checkout session metadata', undefined, { requestId, sessionId, metadata })
      return NextResponse.redirect(new URL('/verify?payment=error', req.url))
    }

    // Get subject user's email for CERTN
    const { data: subjectProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', subjectUserId)
      .single()

    if (!subjectProfile) {
      logger.error('Subject user profile not found', undefined, { requestId, subjectUserId })
      return NextResponse.redirect(new URL('/verify?payment=error', req.url))
    }

    // Initiate each check and create verification records
    let successCount = 0
    let failCount = 0

    for (const checkType of checksNeeded) {
      // Check if already exists (idempotency — webhook may have beaten us)
      const { data: existing } = await supabase
        .from('verifications')
        .select('id')
        .eq('user_id', subjectUserId)
        .eq('type', checkType)
        .eq('stripe_payment_id', sessionId)
        .single()

      if (existing) {
        successCount++
        continue
      }

      const result = await initiateVerification(checkType, subjectProfile.email)

      if (!result.success) {
        failCount++
        logger.error(`Failed to initiate ${checkType} after payment`, undefined, {
          requestId,
          sessionId,
          checkType,
          error: result.error,
        })
        continue
      }

      const { error: insertError } = await supabase
        .from('verifications')
        .insert({
          user_id: subjectUserId,
          type: checkType,
          provider: 'certn',
          external_id: result.caseId,
          status: 'pending',
          stripe_payment_id: sessionId,
          paid_by: paidBy || subjectUserId,
        })

      if (insertError) {
        failCount++
        logger.error(`Failed to save ${checkType} verification after payment`, undefined, {
          requestId,
          sessionId,
          checkType,
          error: insertError.message,
        })
      } else {
        successCount++
      }
    }

    if (failCount > 0) {
      logger.error('Verification partial-failure after payment', undefined, {
        requestId,
        sessionId,
        successCount,
        failCount,
        checksNeeded,
      })
      // Any check failing after a successful payment is user-visible — send them
      // to an error state so they can reach support instead of silently showing
      // an incomplete verification list.
      const url = new URL('/verify', req.url)
      url.searchParams.set('payment', successCount === 0 ? 'error' : 'partial')
      url.searchParams.set('succeeded', String(successCount))
      url.searchParams.set('failed', String(failCount))
      return NextResponse.redirect(url)
    }

    return NextResponse.redirect(new URL('/verify?payment=success', req.url))
  },
  // Was `rateLimit: false`. This route hits Stripe and CERTN once per call, so
  // an unthrottled loop over it is a billable-API amplifier; 'api' (100/min,
  // fail-open) is generous for a redirect landing users hit once per purchase.
  { rateLimit: 'api' }
)
