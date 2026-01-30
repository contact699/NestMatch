// Certn ID Verification service wrapper
// Documentation: https://docs.certn.co/

const CERTN_API_KEY = process.env.CERTN_API_KEY
const CERTN_API_URL = 'https://api.certn.co/hr/v1'

interface CertnApplication {
  id: string
  status: string
  result?: any
}

interface CertnResponse {
  success: boolean
  applicationId?: string
  status?: string
  error?: string
}

function getCertnAuth(): string {
  return `Bearer ${CERTN_API_KEY}`
}

export async function initiateIDVerification(
  email: string,
  firstName?: string,
  lastName?: string
): Promise<CertnResponse> {
  if (!CERTN_API_KEY) {
    console.error('Certn API key not configured')
    return { success: false, error: 'ID verification is not configured' }
  }

  try {
    const response = await fetch(`${CERTN_API_URL}/applications/`, {
      method: 'POST',
      headers: {
        'Authorization': getCertnAuth(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        first_name: firstName,
        last_name: lastName,
        request_identity_verification: true,
        request_enhanced_identity_verification: false,
        request_softcheck: false,
        request_criminal_record_check: false,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Certn error:', data)
      return {
        success: false,
        error: data.detail || data.message || 'Failed to initiate verification',
      }
    }

    return {
      success: true,
      applicationId: data.id,
      status: data.status,
    }
  } catch (error) {
    console.error('Error initiating Certn verification:', error)
    return { success: false, error: 'Failed to initiate ID verification' }
  }
}

export async function checkVerificationStatus(applicationId: string): Promise<CertnResponse> {
  if (!CERTN_API_KEY) {
    console.error('Certn API key not configured')
    return { success: false, error: 'ID verification is not configured' }
  }

  try {
    const response = await fetch(`${CERTN_API_URL}/applications/${applicationId}/`, {
      method: 'GET',
      headers: {
        'Authorization': getCertnAuth(),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Certn status error:', data)
      return {
        success: false,
        error: data.detail || 'Failed to check verification status',
      }
    }

    return {
      success: true,
      applicationId: data.id,
      status: data.status,
    }
  } catch (error) {
    console.error('Error checking Certn status:', error)
    return { success: false, error: 'Failed to check verification status' }
  }
}

// Map Certn status to our verification status
export function mapCertnStatus(certnStatus: string): 'pending' | 'completed' | 'failed' {
  switch (certnStatus.toLowerCase()) {
    case 'complete':
    case 'completed':
    case 'returned':
      return 'completed'
    case 'cancelled':
    case 'failed':
    case 'rejected':
      return 'failed'
    default:
      return 'pending'
  }
}
