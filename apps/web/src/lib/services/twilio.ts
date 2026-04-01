// Twilio Verify service wrapper

import { logger } from '@/lib/logger'

interface TwilioError {
  code: number
  message: string
}

interface VerificationResponse {
  success: boolean
  status?: string
  error?: string
}

interface TwilioConfig {
  accountSid: string
  authToken: string
  verifyServiceSid: string
}

function cleanEnv(value?: string): string {
  if (!value) return ''
  return value.trim().replace(/^['"]|['"]$/g, '')
}

function getTwilioConfig():
  | { ok: true; config: TwilioConfig }
  | { ok: false; missing: string[]; error: string } {
  const accountSid = cleanEnv(process.env.TWILIO_ACCOUNT_SID)
  const authToken = cleanEnv(process.env.TWILIO_AUTH_TOKEN)
  // Support a common alias as fallback.
  const verifyServiceSid = cleanEnv(
    process.env.TWILIO_VERIFY_SERVICE_SID || process.env.TWILIO_SERVICE_SID
  )

  const missing: string[] = []
  if (!accountSid) missing.push('TWILIO_ACCOUNT_SID')
  if (!authToken) missing.push('TWILIO_AUTH_TOKEN')
  if (!verifyServiceSid) missing.push('TWILIO_VERIFY_SERVICE_SID')

  if (missing.length > 0) {
    return {
      ok: false,
      missing,
      error: `Phone verification is not configured. Missing: ${missing.join(', ')}`,
    }
  }

  return {
    ok: true,
    config: { accountSid, authToken, verifyServiceSid },
  }
}

function getTwilioAuth(accountSid: string, authToken: string): string {
  return Buffer.from(`${accountSid}:${authToken}`).toString('base64')
}

export async function sendVerificationCode(phoneNumber: string): Promise<VerificationResponse> {
  const configResult = getTwilioConfig()
  if (!configResult.ok) {
    logger.error(
      'Twilio credentials not configured',
      new Error(configResult.error),
      { missing: configResult.missing }
    )
    return { success: false, error: configResult.error }
  }
  const { accountSid, authToken, verifyServiceSid } = configResult.config

  // Normalize phone number (ensure it starts with +)
  const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`

  try {
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${getTwilioAuth(accountSid, authToken)}`,
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
  const configResult = getTwilioConfig()
  if (!configResult.ok) {
    logger.error(
      'Twilio credentials not configured',
      new Error(configResult.error),
      { missing: configResult.missing }
    )
    return { success: false, error: configResult.error }
  }
  const { accountSid, authToken, verifyServiceSid } = configResult.config

  // Normalize phone number
  const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`

  try {
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${getTwilioAuth(accountSid, authToken)}`,
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
