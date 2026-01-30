import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
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

    // Get profile verification status
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('email_verified, phone_verified, verification_level, verified_at')
      .eq('user_id', user.id)
      .single() as { data: any; error: any }

    // Get all verification records
    const { data: verifications } = await (supabase as any)
      .from('verifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }) as { data: any[] | null; error: any }

    return NextResponse.json({
      profile: {
        email_verified: profile?.email_verified || false,
        phone_verified: profile?.phone_verified || false,
        verification_level: profile?.verification_level || 'basic',
        verified_at: profile?.verified_at,
      },
      verifications: verifications || [],
    })
  } catch (error) {
    console.error('Error in GET /api/verify/status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
