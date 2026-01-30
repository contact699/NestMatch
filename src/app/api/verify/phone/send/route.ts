import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendVerificationCode } from '@/lib/services/twilio'
import { z } from 'zod'

const phoneSchema = z.object({
  phone: z.string().min(10, 'Invalid phone number'),
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
    const validationResult = phoneSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      )
    }

    const { phone } = validationResult.data

    // Send verification code
    const result = await sendVerificationCode(phone)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Store phone number temporarily in profile (unverified)
    await (supabase as any)
      .from('profiles')
      .update({ phone })
      .eq('user_id', user.id)

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
    })
  } catch (error) {
    console.error('Error in POST /api/verify/phone/send:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
