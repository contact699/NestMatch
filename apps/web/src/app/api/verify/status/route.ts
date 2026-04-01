import { NextRequest } from 'next/server'
import { withApiHandler, apiResponse } from '@/lib/api/with-handler'

export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Get profile verification status
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, profile_photo, city, province, occupation, email_verified, phone, phone_verified, verification_level, verified_at, created_at')
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
        name: profile?.name || null,
        profile_photo: profile?.profile_photo || null,
        city: profile?.city || null,
        province: profile?.province || null,
        occupation: profile?.occupation || null,
        email_verified: profile?.email_verified || false,
        phone: profile?.phone || null,
        phone_verified: profile?.phone_verified || false,
        verification_level: profile?.verification_level || 'basic',
        verified_at: profile?.verified_at || null,
        created_at: profile?.created_at || null,
      },
      verifications: verifications || [],
    }, 200, requestId)
  },
  { rateLimit: 'default' }
)
