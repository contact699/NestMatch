import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withApiHandler, apiResponse, parseBody } from '@/lib/api/with-handler'
import { sendVerificationCode } from '@/lib/services/twilio'
import { ValidationError } from '@/lib/error-reporter'

const phoneSchema = z.object({
  phone: z.string().min(10, 'Invalid phone number'),
})

export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Validate input
    let phone: string
    try {
      const body = await parseBody(req, phoneSchema)
      phone = body.phone
    } catch {
      throw new ValidationError('Invalid phone number')
    }

    // Send verification code
    const result = await sendVerificationCode(phone)

    if (!result.success) {
      return apiResponse({ error: result.error }, 400, requestId)
    }

    // Store phone number temporarily in profile (unverified)
    await (supabase as any)
      .from('profiles')
      .update({ phone })
      .eq('user_id', userId)

    return apiResponse({
      success: true,
      message: 'Verification code sent',
    }, 200, requestId)
  },
  {
    rateLimit: 'phoneVerify',
    audit: {
      action: 'verification_start',
      resourceType: 'phone_verification',
    },
  }
)
