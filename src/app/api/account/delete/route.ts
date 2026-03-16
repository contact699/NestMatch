import { withApiHandler, apiResponse } from '@/lib/api/with-handler'
import { createServiceClient } from '@/lib/supabase/service'

export const DELETE = withApiHandler(
  async (_req, { userId, supabase, requestId }) => {
    // Service client is REQUIRED for account deletion (admin.deleteUser)
    let serviceClient
    try {
      serviceClient = createServiceClient()
    } catch {
      throw new Error('Account deletion is temporarily unavailable. Please contact support.')
    }

    // 1. Deactivate all user's listings
    const { error: listingsError } = await serviceClient
      .from('listings')
      .update({ is_active: false })
      .eq('user_id', userId!)

    if (listingsError) {
      throw new Error(`Failed to deactivate listings: ${listingsError.message}`)
    }

    // 2. Anonymize profile
    const { error: profileError } = await serviceClient
      .from('profiles')
      .update({
        name: 'Deleted User',
        bio: null,
        profile_photo: null,
        photos: null,
        phone: null,
        email: `deleted-${userId}@nestmatch.invalid`,
        city: null,
        province: null,
        languages: [],
        is_online: false,
        occupation: null,
        age: null,
        gender: null,
      })
      .eq('user_id', userId!)

    if (profileError) {
      throw new Error(`Failed to anonymize profile: ${profileError.message}`)
    }

    // 3. Delete auth user (requires service role client)
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId!)

    if (deleteError) {
      throw new Error(`Failed to delete auth user: ${deleteError.message}`)
    }

    return apiResponse({ success: true }, 200, requestId)
  },
  { rateLimit: 'api' }
)
