'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clientLogger } from '@/lib/client-logger'
import { Bell, UserPlus, UserCheck, UserX, Mail, Users, Check } from 'lucide-react'
import { cn, getRelativeTime } from '@/lib/utils'

interface Notification {
  id: string
  user_id: string
  type: 'join_request_received' | 'join_request_accepted' | 'join_request_declined' | 'invitation_received' | 'member_joined'
  title: string
  body: string
  link: string
  metadata: Record<string, unknown>
  read_at: string | null
  created_at: string
}

const notificationIconMap = {
  join_request_received: { icon: UserPlus, className: 'text-blue-500' },
  join_request_accepted: { icon: UserCheck, className: 'text-green-500' },
  join_request_declined: { icon: UserX, className: 'text-red-500' },
  invitation_received: { icon: Mail, className: 'text-purple-500' },
  member_joined: { icon: Users, className: 'text-green-500' },
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

  // Fetch notifications on mount and subscribe to real-time updates
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
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-all duration-300"
      >
        <div className="relative">
          <Bell className="h-5 w-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full animate-bounce-subtle">
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
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-scale-in origin-top-right">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Check className="h-3 w-3" />
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notification) => {
                  const { icon: Icon, className: iconClassName } =
                    notificationIconMap[notification.type] ?? { icon: Bell, className: 'text-gray-500' }

                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50',
                        notification.read_at ? 'bg-white' : 'bg-blue-50'
                      )}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <Icon className={cn('h-5 w-5', iconClassName)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {notification.body}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
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
