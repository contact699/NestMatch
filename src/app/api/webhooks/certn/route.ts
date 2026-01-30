import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapCertnStatus } from '@/lib/services/certn'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Certn sends webhook events with application data
    const { id: applicationId, status: certnStatus } = body

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Missing application ID' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Find verification by external_id
    const { data: verification, error: findError } = await (supabase as any)
      .from('verifications')
      .select('id, user_id, status')
      .eq('external_id', applicationId)
      .eq('provider', 'certn')
      .single() as { data: any; error: any }

    if (findError || !verification) {
      console.error('Verification not found for application:', applicationId)
      return NextResponse.json(
        { error: 'Verification not found' },
        { status: 404 }
      )
    }

    // Map Certn status to our status
    const newStatus = mapCertnStatus(certnStatus)

    // Update verification record
    const updateData: any = {
      status: newStatus,
      result: body,
    }

    if (newStatus === 'completed' || newStatus === 'failed') {
      updateData.completed_at = new Date().toISOString()

      // Set expiration (1 year from now for completed verifications)
      if (newStatus === 'completed') {
        const expiresAt = new Date()
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
        updateData.expires_at = expiresAt.toISOString()
      }
    }

    const { error: updateError } = await (supabase as any)
      .from('verifications')
      .update(updateData)
      .eq('id', verification.id) as { error: any }

    if (updateError) {
      console.error('Error updating verification:', updateError)
      return NextResponse.json(
        { error: 'Failed to update verification' },
        { status: 500 }
      )
    }

    // If completed successfully, update user's verification level
    if (newStatus === 'completed') {
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('phone_verified, verification_level')
        .eq('user_id', verification.user_id)
        .single() as { data: any; error: any }

      // Upgrade to 'trusted' if ID verification passes
      if (profile) {
        await (supabase as any)
          .from('profiles')
          .update({
            verification_level: 'trusted',
            verified_at: new Date().toISOString(),
          })
          .eq('user_id', verification.user_id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/webhooks/certn:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
