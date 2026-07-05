'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clientLogger } from '@/lib/client-logger'
import { Bell, UserPlus, UserCheck, UserX, Mail, Users, MessageCircle, Check } from 'lucide-react'
import { cn, getRelativeTime } from '@/lib/utils'

interface Notification {
  id: string
  user_id: string
  type:
    | 'join_request_received'
    | 'join_request_accepted'
    | 'join_request_declined'
    | 'invitation_received'
    | 'member_joined'
    | 'new_message'
  title: string
  body: string
  link: string
  metadata: Record<string, unknown>
  read_at: string | null
  created_at: string
}

const notificationIconMap = {
  join_request_received: { icon: UserPlus, className: 'text-primary' },
  join_request_accepted: { icon: UserCheck, className: 'text-secondary' },
  join_request_declined: { icon: UserX, className: 'text-error' },
  invitation_received: { icon: Mail, className: 'text-tertiary-container' },
  member_joined: { icon: Users, className: 'text-secondary' },
  new_message: { icon: MessageCircle, className: 'text-primary' },
} as const

interface NotificationBellProps {
  userId: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications ?? [])
        setUnreadCount(data.unread_count ?? 0)
      }
    } catch (error) {
      clientLogger.error('Error fetching notifications', error)
    }
  }, [])

  // Fetch on mount and subscribe to realtime INSERTs for this user.
  useEffect(() => {
    fetchNotifications()

    const supabase = createClient()
    const channel = supabase
      .channel('navbar-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchNotifications])

  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: notificationIds }),
      })
      if (response.ok) {
        await fetchNotifications()
      }
    } catch (error) {
      clientLogger.error('Error marking notification as read', error)
    }
  }, [fetchNotifications])

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true }),
      })
      if (response.ok) {
        await fetchNotifications()
      }
    } catch (error) {
      clientLogger.error('Error marking all notifications as read', error)
    }
  }, [fetchNotifications])

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    if (!notification.read_at) {
      await markAsRead([notification.id])
    }
    setIsOpen(false)
    router.push(notification.link)
  }, [markAsRead, router])

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-container-low transition-all duration-300"
        aria-label="Notifications"
      >
        <div className="relative">
          <Bell className="h-5 w-5 text-on-surface-variant" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-4 h-4 bg-error text-on-error text-[10px] font-bold rounded-full animate-bounce-subtle">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-lg shadow-lg border border-outline-variant/15 z-50 animate-scale-in origin-top-right">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/15">
              <h3 className="text-sm font-semibold text-on-surface">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <Check className="h-3 w-3" />
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-on-surface-variant">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notification) => {
                  const { icon: Icon, className: iconClassName } =
                    notificationIconMap[notification.type] ?? { icon: Bell, className: 'text-on-surface-variant' }

                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-low',
                        notification.read_at ? 'bg-surface-container-lowest' : 'bg-primary-fixed'
                      )}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <Icon className={cn('h-5 w-5', iconClassName)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-on-surface truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-on-surface-variant line-clamp-2">
                          {notification.body}
                        </p>
                        <p className="text-xs text-on-surface-variant/70 mt-1">
                          {getRelativeTime(notification.created_at)}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
