import { NextRequest } from 'next/server'
import { withApiHandler, apiResponse } from '@/lib/api/with-handler'

export const DELETE = withApiHandler(
  async (req, { userId, supabase, requestId, params }) => {
    const { listingId } = params

    // Delete saved listing
    const { error } = await supabase
      .from('saved_listings')
      .delete()
      .eq('user_id', userId!)
      .eq('listing_id', listingId)

    if (error) throw error

    return apiResponse({ success: true }, 200, requestId)
  },
  { rateLimit: 'default' }
)
