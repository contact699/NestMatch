import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initiateIDVerification } from '@/lib/services/certn'

export async function POST(request: NextRequest) {
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

    // Get user profile
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('email, name')
      .eq('user_id', user.id)
      .single() as { data: any; error: any }

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check if already has pending or completed ID verification
    const { data: existingVerification } = await (supabase as any)
      .from('verifications')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('type', 'id')
      .in('status', ['pending', 'completed'])
      .single() as { data: any; error: any }

    if (existingVerification) {
      if (existingVerification.status === 'completed') {
        return NextResponse.json(
          { error: 'ID verification already completed' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'ID verification already in progress' },
        { status: 409 }
      )
    }

    // Parse name into first and last
    const nameParts = (profile.name || '').split(' ')
    const firstName = nameParts[0] || undefined
    const lastName = nameParts.slice(1).join(' ') || undefined

    // Initiate verification with Certn
    const result = await initiateIDVerification(
      profile.email,
      firstName,
      lastName
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Create verification record
    const { data: verification, error } = await (supabase as any)
      .from('verifications')
      .insert({
        user_id: user.id,
        type: 'id',
        provider: 'certn',
        external_id: result.applicationId,
        status: 'pending',
      })
      .select()
      .single() as { data: any; error: any }

    if (error) {
      console.error('Error creating verification record:', error)
      return NextResponse.json(
        { error: 'Failed to create verification record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      verification_id: verification.id,
      message: 'ID verification initiated. You will receive an email from Certn to complete the process.',
    })
  } catch (error) {
    console.error('Error in POST /api/verify/id/initiate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
