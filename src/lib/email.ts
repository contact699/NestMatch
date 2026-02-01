import { Resend } from 'resend'

// Lazy initialization to avoid build errors when API key is not set
let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log('Email would be sent to:', to, 'Subject:', subject)
    return { success: true, mock: true }
  }

  try {
    const resend = getResendClient()
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'NestMatch <noreply@nestmatch.com>',
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Email error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, error }
  }
}
