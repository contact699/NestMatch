import { NextRequest } from 'next/server'
import { withApiHandler, apiResponse, NotFoundError } from '@/lib/api/with-handler'
import { initiateIDVerification } from '@/lib/services/certn'

export const POST = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('user_id', userId!)
      .single()

    if (!profile) {
      throw new NotFoundError('Profile not found')
    }

    // Check if already has pending or completed ID verification
    const { data: existingVerification } = await supabase
      .from('verifications')
      .select('id, status')
      .eq('user_id', userId!)
      .eq('type', 'id')
      .in('status', ['pending', 'completed'])
      .single()

    if (existingVerification) {
      if (existingVerification.status === 'completed') {
        return apiResponse({ error: 'ID verification already completed' }, 409, requestId)
      }
      return apiResponse({ error: 'ID verification already in progress' }, 409, requestId)
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
      return apiResponse({ error: result.error }, 400, requestId)
    }

    // Create verification record
    const { data: verification, error } = await supabase
      .from('verifications')
      .insert({
        user_id: userId!,
        type: 'id',
        provider: 'certn',
        external_id: result.applicationId,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    return apiResponse({
      success: true,
      verification_id: verification.id,
      message: 'ID verification initiated. You will receive an email from Certn to complete the process.',
    }, 200, requestId)
  },
  {
    rateLimit: 'idVerify',
    audit: {
      action: 'verification_start',
      resourceType: 'id_verification',
      getResourceId: (_req, res) => res?.verification_id,
    },
  }
)
