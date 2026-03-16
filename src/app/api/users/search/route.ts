import { NextRequest } from 'next/server'
import { withApiHandler, apiResponse } from '@/lib/api/with-handler'
import { createServiceClient } from '@/lib/supabase/service'

function sanitizeForPostgrest(input: string): string {
  return input.replace(/[,%.*()\\]/g, '')
}

// Search users by name or city
export const GET = withApiHandler(
  async (req, { userId, supabase, requestId }) => {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')?.trim() || ''

    if (query.length < 2) {
      return apiResponse({ users: [] }, 200, requestId)
    }

    const svcClient = (() => {
      try { return createServiceClient() } catch { return supabase }
    })()

    // Search profiles by name or city using ilike
    const safeQuery = sanitizeForPostgrest(query)
    if (safeQuery.length < 2) {
      return apiResponse({ users: [] }, 200, requestId)
    }
    const pattern = `%${safeQuery}%`

    const { data: users, error } = await svcClient
      .from('profiles')
      .select('user_id, name, profile_photo, city, province, verification_level')
      .not('name', 'is', null)
      .neq('user_id', userId!)
      .or(`name.ilike.${pattern},city.ilike.${pattern}`)
      .limit(10)

    if (error) throw error

    return apiResponse({ users: users || [] }, 200, requestId)
  },
  {
    rateLimit: 'api',
  }
)
