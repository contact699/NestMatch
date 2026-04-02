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

    if (session.payment_status !== 'paid') {
      logger.warn('Checkout session not paid', { requestId, sessionId, status: session.payment_status })
      return NextResponse.redirect(new URL('/verify?payment=error', req.url))
    }

    const metadata = session.metadata || {}
    const subjectUserId = metadata.subject_user_id
    const paidBy = metadata.paid_by
    const checksNeeded: VerificationCheckType[] = JSON.parse(metadata.checks_needed || '[]')

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

    if (successCount === 0 && failCount > 0) {
      return NextResponse.redirect(new URL('/verify?payment=error', req.url))
    }

    return NextResponse.redirect(new URL('/verify?payment=success', req.url))
  },
  { rateLimit: false }
)
