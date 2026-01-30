import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCode } from '@/lib/services/twilio'
import { z } from 'zod'

const verifySchema = z.object({
  phone: z.string().min(10, 'Invalid phone number'),
  code: z.string().length(6, 'Code must be 6 digits'),
})

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

    const body = await request.json()

    // Validate input
    const validationResult = verifySchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { phone, code } = validationResult.data

    // Verify code with Twilio
    const result = await verifyCode(phone, code)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Update profile with verified phone
    const { error: updateError } = await (supabase as any)
      .from('profiles')
      .update({
        phone,
        phone_verified: true,
      })
      .eq('user_id', user.id) as { error: any }

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Update verification level if email is also verified
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('email_verified')
      .eq('user_id', user.id)
      .single() as { data: any; error: any }

    if (profile?.email_verified) {
      await (supabase as any)
        .from('profiles')
        .update({ verification_level: 'verified' })
        .eq('user_id', user.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Phone verified successfully',
    })
  } catch (error) {
    console.error('Error in POST /api/verify/phone/confirm:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
