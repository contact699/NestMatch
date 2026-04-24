import { createClient } from '@supabase/supabase-js'
import { withPublicHandler, apiResponse } from '@/lib/api/with-handler'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const GET = withPublicHandler(
  async (_req, { requestId }) => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Surface newest profiles that have enough content to render a decent card.
    // Requires name + profile_photo; bio is nice-to-have but not required.
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_id, name, profile_photo, verification_level, bio, city, created_at')
      .not('name', 'is', null)
      .not('profile_photo', 'is', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(8)

    if (error) throw error

    return apiResponse({ profiles: profiles || [] }, 200, requestId)
  },
  { rateLimit: 'search' }
)
