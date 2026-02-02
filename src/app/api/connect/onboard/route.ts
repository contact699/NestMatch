import { NextRequest } from 'next/server'
import { withApiHandler, apiResponse, NotFoundError } from '@/lib/api/with-handler'
import {
  createConnectAccount,
  createAccountLink,
  getConnectAccount,
} from '@/lib/services/stripe'

// Start or continue Connect onboarding
export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Get user profile
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('email, name')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      throw new NotFoundError('Profile not found')
    }

    // Check if user already has a Connect account
    let { data: payoutAccount } = await (supabase as any)
      .from('payout_accounts')
      .select('*')
      .eq('user_id', userId)
      .single()

    let stripeAccountId: string

    if (payoutAccount) {
      // Use existing account
      stripeAccountId = payoutAccount.stripe_connect_account_id

      // Check if onboarding is complete
      const account = await getConnectAccount(stripeAccountId)

      if (account.details_submitted) {
        // Update local record
        await (supabase as any)
          .from('payout_accounts')
          .update({
            status: account.charges_enabled ? 'active' : 'restricted',
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)

        return apiResponse({
          status: 'complete',
          account: {
            id: account.id,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
          },
        }, 200, requestId)
      }
    } else {
      // Create new Connect account
      const account = await createConnectAccount(profile.email, userId)
      stripeAccountId = account.id

      // Save to database
      await (supabase as any)
        .from('payout_accounts')
        .insert({
          user_id: userId,
          stripe_connect_account_id: account.id,
          account_type: 'express',
          status: 'pending',
        })
    }

    // Create account link for onboarding
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const accountLink = await createAccountLink(
      stripeAccountId,
      `${baseUrl}/settings/payments?refresh=true`,
      `${baseUrl}/settings/payments?success=true`
    )

    // Update onboarding URL in database
    await (supabase as any)
      .from('payout_accounts')
      .update({
        onboarding_url: accountLink.url,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    return apiResponse({
      status: 'onboarding',
      onboarding_url: accountLink.url,
      expires_at: new Date(accountLink.expires_at * 1000).toISOString(),
    }, 200, requestId)
  },
  {
    audit: {
      action: 'create',
      resourceType: 'connect_account',
    },
  }
)
