import { createClient } from '@supabase/supabase-js'
import { withPublicHandler, apiResponse } from '@/lib/api/with-handler'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const GET = withPublicHandler(
  async (_req, { requestId }) => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: listings, error } = await supabase
      .from('listings')
      .select(`
        id,
        title,
        description,
        city,
        province,
        price,
        type,
        photos,
        newcomer_friendly,
        no_credit_history_ok,
        utilities_included,
        available_date,
        created_at,
        user_id,
        listing_verification_level,
        verification_flags
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(24)

    if (error) throw error

    // Soft-gate: drop auto-flagged listings, then cap at 8 featured.
    type PublicRow = Record<string, unknown> & {
      user_id: string
      verification_flags: { photo_reuse?: unknown; duplicate_of?: unknown } | null
    }
    const clean = ((listings || []) as unknown as PublicRow[])
      .filter((l) => {
        const f = l.verification_flags || {}
        return !f.photo_reuse && !f.duplicate_of
      })
      .slice(0, 8)

    // Attach host profile — done as a second query because PostgREST can't
    // auto-resolve listings→profiles (listings.user_id FKs auth.users, not profiles).
    const userIds = Array.from(new Set(clean.map((l) => l.user_id)))
    const profilesById: Record<string, {
      name: string | null
      profile_photo: string | null
      verification_level: string
      show_verification_badges: boolean
    }> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, profile_photo, verification_level, show_verification_badges')
        .in('user_id', userIds)

      for (const p of profiles || []) {
        profilesById[p.user_id] = {
          name: p.name,
          profile_photo: p.profile_photo,
          verification_level: p.verification_level,
          show_verification_badges: p.show_verification_badges,
        }
      }
    }

    const enriched = clean.map((l) => {
      const rest: Record<string, unknown> = { ...l }
      delete rest.verification_flags
      return {
        ...rest,
        profiles: profilesById[l.user_id] ?? null,
      }
    })

    return apiResponse({ listings: enriched }, 200, requestId)
  },
  { rateLimit: 'search' }
)
