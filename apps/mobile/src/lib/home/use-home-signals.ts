// React-query hook that fans out to all five home-signal queries in parallel
// and composes HeroContent. Pure helpers live in ./hero-content so the test
// suite can import them without pulling Expo/RN-only modules.

import { useQueries } from '@tanstack/react-query'
import { useAuth } from '@/providers/auth-provider'
import { supabase } from '@/lib/supabase'
import { getFlagshipBySlug } from '@/lib/cities'
import {
  COMPLETION_FIELDS,
  ZERO_SIGNALS,
  composeHeroContent,
  fieldPresent,
  selectVariant,
} from './hero-content'
import type { HomeSignals, HeroContent, ProfileSnapshot } from './types'

const STALE_MS = 60_000 // 60s

// Re-export so call sites can import either from this file or ./hero-content.
export { selectVariant, composeHeroContent }

/**
 * Reads everything the hero needs in one hook. Caller passes the currently
 * selected city slug (managed by the parent home screen).
 */
export function useHomeSignals(citySlug: string): {
  content: HeroContent | null
  isLoading: boolean
  refetch: () => void
} {
  const { user } = useAuth()
  const userId = user?.id
  const city = getFlagshipBySlug(citySlug)
  const cityDbName = city?.dbName ?? null

  const queries = useQueries({
    queries: [
      {
        queryKey: ['home-signal', 'new-matches', userId],
        enabled: !!userId,
        staleTime: STALE_MS,
        queryFn: async () => {
          const [{ data: suggestions }, { data: interactions }] = await Promise.all([
            supabase
              .from('group_suggestions')
              .select('id')
              .eq('target_user_id', userId!)
              .eq('status', 'active')
              .gt('expires_at', new Date().toISOString()),
            supabase
              .from('suggestion_interactions')
              .select('suggestion_id')
              .eq('user_id', userId!),
          ])
          const seen = new Set((interactions ?? []).map((i: { suggestion_id: string }) => i.suggestion_id))
          return (suggestions ?? []).filter((s: { id: string }) => !seen.has(s.id)).length
        },
      },
      {
        queryKey: ['home-signal', 'pending-invites', userId],
        enabled: !!userId,
        staleTime: STALE_MS,
        queryFn: async () => {
          const { count } = await supabase
            .from('co_renter_invitations')
            .select('id', { count: 'exact', head: true })
            .eq('invitee_id', userId!)
            .eq('status', 'pending')
          return count ?? 0
        },
      },
      {
        queryKey: ['home-signal', 'unread-messages', userId],
        enabled: !!userId,
        staleTime: STALE_MS,
        queryFn: async () => {
          // Group-chat read tracking lives on co_renter_members.last_read_at
          // (migration 027), not messages.read_at — so messages.read_at IS NULL
          // matches every group message forever. Scope to 1:1 (group_id IS NULL)
          // conversations only. Group unread is a follow-up; see /api/groups/unread
          // on the web side for the canonical pattern.
          const { data: convs } = await supabase
            .from('conversations')
            .select('id')
            .is('group_id', null)
            .contains('participant_ids', [userId!])
          if (!convs || convs.length === 0) return 0
          const ids = convs.map((c: { id: string }) => c.id)
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .in('conversation_id', ids)
            .neq('sender_id', userId!)
            .is('read_at', null)
          return count ?? 0
        },
      },
      {
        queryKey: ['home-signal', 'updated-saved', userId],
        enabled: !!userId,
        staleTime: STALE_MS,
        queryFn: async () => {
          // Two queries instead of a join: the typed Supabase client requires
          // Relationships:[] entries on every table or joins resolve to `never`.
          // Two simple queries are safer and the dataset is tiny.
          const { data: saved } = await supabase
            .from('saved_listings')
            .select('listing_id, created_at')
            .eq('user_id', userId!)
          if (!saved || saved.length === 0) return 0
          const ids = saved.map((s: { listing_id: string; created_at: string }) => s.listing_id)
          const { data: listings } = await supabase
            .from('listings')
            .select('id, updated_at')
            .in('id', ids)
          if (!listings) return 0
          const updatedById = new Map(
            listings.map((l: { id: string; updated_at: string }) => [l.id, new Date(l.updated_at).getTime()]),
          )
          return saved.filter((s: { listing_id: string; created_at: string }) => {
            const updatedAt = updatedById.get(s.listing_id) ?? 0
            return updatedAt > new Date(s.created_at).getTime()
          }).length
        },
      },
      {
        queryKey: ['home-signal', 'city-new', cityDbName],
        enabled: !!cityDbName,
        staleTime: STALE_MS,
        queryFn: async () => {
          const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          const { count } = await supabase
            .from('listings')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)
            .ilike('city', cityDbName!)
            .gt('created_at', since)
          return count ?? 0
        },
      },
      {
        queryKey: ['home-signal', 'profile', userId],
        enabled: !!userId,
        staleTime: STALE_MS,
        queryFn: async () => {
          const { data } = await supabase
            .from('profiles')
            .select('name, bio, age, gender, occupation, city, household_situation, profile_photo')
            .eq('user_id', userId!)
            .single()
          return data ?? {}
        },
      },
    ],
  })

  const isLoading = queries.some((q) => q.isLoading)
  if (!userId) return { content: null, isLoading: true, refetch: () => {} }

  const signals: HomeSignals = {
    newMatches: (queries[0].data as number | undefined) ?? 0,
    pendingInvites: (queries[1].data as number | undefined) ?? 0,
    unreadMessages: (queries[2].data as number | undefined) ?? 0,
    updatedSavedListings: (queries[3].data as number | undefined) ?? 0,
    cityNewListings: (queries[4].data as number | undefined) ?? 0,
  }

  const profileRaw = (queries[5].data as Record<string, unknown> | undefined) ?? {}
  let completionCount = 0
  let nextMissing: ProfileSnapshot['nextMissingField'] = null
  for (const field of COMPLETION_FIELDS) {
    if (fieldPresent(profileRaw, field)) completionCount++
    else if (nextMissing === null) nextMissing = field
  }
  const completion = Math.round((completionCount / COMPLETION_FIELDS.length) * 100)
  const firstName = ((profileRaw.name as string | undefined) ?? '').split(' ')[0] || 'there'

  const profileSnap: ProfileSnapshot = {
    completion,
    nextMissingField: nextMissing,
    firstName,
  }

  if (isLoading) {
    return {
      content: { ...composeHeroContent(ZERO_SIGNALS, { ...profileSnap, completion: 100 }, citySlug), variant: 'loading' },
      isLoading: true,
      refetch: () => queries.forEach((q) => q.refetch()),
    }
  }

  return {
    content: composeHeroContent(signals, profileSnap, citySlug),
    isLoading: false,
    refetch: () => queries.forEach((q) => q.refetch()),
  }
}
