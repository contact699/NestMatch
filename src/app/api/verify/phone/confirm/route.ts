import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { verifyCode } from '@/lib/services/twilio'
import { ValidationError } from '@/lib/error-reporter'

const verifySchema = z.object({
  phone: z.string().min(10, 'Invalid phone number'),
  code: z.string().length(6, 'Code must be 6 digits'),
})

export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Validate input
    let phone: string, code: string
    try {
      const body = await parseBody(req, verifySchema)
      phone = body.phone
      code = body.code
    } catch {
      throw new ValidationError('Invalid input')
    }

    // Verify code with Twilio
    const result = await verifyCode(phone, code)

    if (!result.success) {
      return apiResponse({ error: result.error }, 400, requestId)
    }

    // Update profile with verified phone
    const { error: updateError } = await (supabase as any)
      .from('profiles')
      .update({
        phone,
        phone_verified: true,
      })
      .eq('user_id', userId)

    if (updateError) throw updateError

    // Update verification level if email is also verified
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('email_verified')
      .eq('user_id', userId)
      .single()

    if (profile?.email_verified) {
      await (supabase as any)
        .from('profiles')
        .update({ verification_level: 'verified' })
        .eq('user_id', userId)
    }

    return apiResponse({
      success: true,
      message: 'Phone verified successfully',
    }, 200, requestId)
  },
  {
    rateLimit: 'phoneVerify',
    audit: {
      action: 'verification_complete',
      resourceType: 'phone_verification',
    },
  }
)
