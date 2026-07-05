// Real compatibility scores for a set of user ids, via the
// batch_calculate_compatibility RPC (migration 009). Returns a map of
// user_id -> integer score (0-100). Callers MUST hide the badge when a score
// is missing — we never surface a fabricated/placeholder number.

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/providers/auth-provider'
import { supabase } from '@/lib/supabase'

type ScoreRow = { user_id: string; score: number }

export function useMatchScores(userIds: string[]) {
  const { user } = useAuth()
  // Stable key regardless of ordering so the cache hits across renders.
  const others = userIds.filter((id) => id && id !== user?.id)
  const cacheKey = [...others].sort().join(',')

  return useQuery({
    queryKey: ['match-scores', user?.id, cacheKey],
    enabled: !!user && others.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase.rpc('batch_calculate_compatibility', {
        current_user_id: user!.id,
        other_user_ids: others,
      })
      if (error) throw error
      const map: Record<string, number> = {}
      for (const row of (data ?? []) as ScoreRow[]) {
        if (typeof row.score === 'number') map[row.user_id] = row.score
      }
      return map
    },
  })
}
