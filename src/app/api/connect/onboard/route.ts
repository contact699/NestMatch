import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createConnectAccount,
  createAccountLink,
  getConnectAccount,
} from '@/lib/services/stripe'

// Start or continue Connect onboarding
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

    // Check if user already has a Connect account
    let { data: payoutAccount } = await (supabase as any)
      .from('payout_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single() as { data: any }

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
          .eq('user_id', user.id)

        return NextResponse.json({
          status: 'complete',
          account: {
            id: account.id,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
          },
        })
      }
    } else {
      // Create new Connect account
      const account = await createConnectAccount(profile.email, user.id)
      stripeAccountId = account.id

      // Save to database
      const { error: insertError } = await (supabase as any)
        .from('payout_accounts')
        .insert({
          user_id: user.id,
          stripe_connect_account_id: account.id,
          account_type: 'express',
          status: 'pending',
        })

      if (insertError) {
        console.error('Error saving payout account:', insertError)
      }
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
      .eq('user_id', user.id)

    return NextResponse.json({
      status: 'onboarding',
      onboarding_url: accountLink.url,
      expires_at: new Date(accountLink.expires_at * 1000).toISOString(),
    })
  } catch (error) {
    console.error('Error in POST /api/connect/onboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
