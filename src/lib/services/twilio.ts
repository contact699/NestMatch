// Twilio Verify service wrapper

import { logger } from '@/lib/logger'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID

interface TwilioError {
  code: number
  message: string
}

interface VerificationResponse {
  success: boolean
  status?: string
  error?: string
}

function getTwilioAuth(): string {
  return Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')
}

export async function sendVerificationCode(phoneNumber: string): Promise<VerificationResponse> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    logger.error('Twilio credentials not configured')
    return { success: false, error: 'Phone verification is not yet available. Please try again later.' }
  }

  // Normalize phone number (ensure it starts with +)
  const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`

  try {
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${getTwilioAuth()}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: normalizedPhone,
          Channel: 'sms',
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      logger.error('Twilio error', new Error(JSON.stringify(data)))

      // Handle specific Twilio errors
      if (data.code === 60200) {
        return { success: false, error: 'Invalid phone number format' }
      }
      if (data.code === 60203) {
        return { success: false, error: 'Too many verification attempts. Please try again later.' }
      }

      return { success: false, error: data.message || 'Failed to send verification code' }
    }

    return { success: true, status: data.status }
  } catch (error) {
    logger.error('Error sending verification code', error instanceof Error ? error : new Error(String(error)))
    return { success: false, error: 'Failed to send verification code' }
  }
}

export async function verifyCode(phoneNumber: string, code: string): Promise<VerificationResponse> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    logger.error('Twilio credentials not configured')
    return { success: false, error: 'Phone verification is not yet available. Please try again later.' }
  }

  // Normalize phone number
  const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`

  try {
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${getTwilioAuth()}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: normalizedPhone,
          Code: code,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      logger.error('Twilio verification error', new Error(JSON.stringify(data)))

      if (data.code === 60200) {
        return { success: false, error: 'Invalid phone number' }
      }

      return { success: false, error: data.message || 'Failed to verify code' }
    }

    if (data.status === 'approved') {
      return { success: true, status: 'approved' }
    } else {
      return { success: false, error: 'Invalid verification code' }
    }
  } catch (error) {
    logger.error('Error verifying code', error instanceof Error ? error : new Error(String(error)))
    return { success: false, error: 'Failed to verify code' }
  }
}
