export function questionAnsweredEmail({
  userName,
  question,
  faqUrl,
}: {
  userName: string
  question: string
  faqUrl: string
}) {
  return {
    subject: 'Your question has been answered - NestMatch',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; background-color: #f8fafc;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">NestMatch</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px;">Hi ${userName},</p>
              <p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px;">Great news! Your question has been answered and added to our FAQ.</p>
              <!-- Quote box -->
              <div style="background-color: #ffffff; border-left: 4px solid #2563eb; padding: 16px; margin: 0 0 24px 0; border-radius: 4px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                <p style="margin: 0; color: #4b5563; font-size: 14px; font-style: italic;">"${question}"</p>
              </div>
              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 16px 0;">
                    <a href="${faqUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">View Answer</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Thank you for using NestMatch!</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  }
}

export function questionReceivedEmail({
  userName,
  question,
}: {
  userName: string
  question: string
}) {
  return {
    subject: 'We received your question - NestMatch',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; background-color: #f8fafc;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">NestMatch</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px;">Hi ${userName},</p>
              <p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px;">Thank you for submitting your question! Our team will review it and work on providing a helpful answer.</p>
              <!-- Quote box -->
              <div style="background-color: #ffffff; border-left: 4px solid #2563eb; padding: 16px; margin: 0 0 24px 0; border-radius: 4px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                <p style="margin: 0; color: #4b5563; font-size: 14px; font-style: italic;">"${question}"</p>
              </div>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">We'll notify you by email if your question gets answered and added to our FAQ.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Thank you for using NestMatch!</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  }
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nestmatch.com'

export function welcomeEmail(name: string) {
  return {
    subject: 'Welcome to NestMatch!',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; background-color: #f8fafc;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">NestMatch</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px;">Hi ${name},</p>
              <p style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px;">Welcome to NestMatch! We're excited to help you find your perfect roommate.</p>
              <p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px;">NestMatch connects you with verified roommates who match your lifestyle. Our background checks and lifestyle matching ensure you find someone you'll actually enjoy living with.</p>
              <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: 500;">Here's how to get started:</p>
              <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #4b5563; font-size: 15px;">
                <li style="margin-bottom: 8px;">Complete your profile so others can get to know you</li>
                <li style="margin-bottom: 8px;">Take the lifestyle quiz to improve your matches</li>
                <li style="margin-bottom: 0;">Verify your identity to build trust with potential roommates</li>
              </ul>
              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 8px 0;">
                    <a href="${appUrl}/quiz" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">Take the Lifestyle Quiz</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px; text-align: center;">Or <a href="${appUrl}/profile" style="color: #2563eb; text-decoration: underline;">complete your profile</a> first.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Thank you for using NestMatch!</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  }
}

export function verificationCompleteEmail(name: string, verificationType: string) {
  return {
    subject: `Your ${verificationType} is complete`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; background-color: #f8fafc;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">NestMatch</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px;">Hi ${name},</p>
              <p style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px;">Great news! Your <strong>${verificationType}</strong> has been completed successfully.</p>
              <p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px;">Your Trust Center has been updated to reflect your new verification status. Verified profiles get more visibility and build trust with potential roommates.</p>
              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 16px 0;">
                    <a href="${appUrl}/verify" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">View Your Trust Center</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Thank you for using NestMatch!</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  }
}

export function newMessageEmail(recipientName: string, senderName: string) {
  return {
    subject: `New message from ${senderName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; background-color: #f8fafc;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">NestMatch</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px;">Hi ${recipientName},</p>
              <p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px;"><strong>${senderName}</strong> sent you a new message on NestMatch. Don't keep them waiting!</p>
              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 16px 0;">
                    <a href="${appUrl}/messages" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">View Conversation</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Thank you for using NestMatch!</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  }
}
