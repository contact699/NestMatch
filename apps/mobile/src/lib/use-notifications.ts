// Notifications: unread-count badge with live updates via realtime INSERTs.
// The notifications table has SELECT/UPDATE-own RLS and its realtime publication
// is enabled, so we subscribe filtered to the current user.

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/providers/auth-provider'
import { supabase } from '@/lib/supabase'

export type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  link: string | null
  metadata: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

/**
 * Live unread-notification count for the signed-in user. Subscribes to INSERTs
 * so the home bell badge updates without a manual refetch.
 */
export function useUnreadNotificationCount(): number {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications-unread', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .is('read_at', null)
      if (error) throw error
      return count ?? 0
    },
  })

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications-unread', user.id] })
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, queryClient])

  return data ?? 0
}
