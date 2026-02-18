import { NextRequest } from 'next/server'
import { withApiHandler, apiResponse } from '@/lib/api/with-handler'

export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Get profile verification status
    const { data: profile } = await supabase
      .from('profiles')
      .select('email_verified, phone_verified, verification_level, verified_at')
      .eq('user_id', userId!)
      .single()

    // Sync email verification from auth if profile is out of date
    if (profile && !profile.email_verified) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) {
        await supabase
          .from('profiles')
          .update({ email_verified: true })
          .eq('user_id', userId!)
        profile.email_verified = true
      }
    }

    // Get all verification records
    const { data: verifications, error } = await supabase
      .from('verifications')
      .select('*')
      .eq('user_id', userId!)
      .order('created_at', { ascending: false })

    if (error) throw error

    return apiResponse({
      profile: {
        email_verified: profile?.email_verified || false,
        phone_verified: profile?.phone_verified || false,
        verification_level: profile?.verification_level || 'basic',
        verified_at: profile?.verified_at,
      },
      verifications: verifications || [],
    }, 200, requestId)
  },
  { rateLimit: 'default' }
)
