import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/logger'

export type NotificationType =
  | 'join_request_received'
  | 'join_request_accepted'
  | 'join_request_declined'
  | 'invitation_received'
  | 'member_joined'
  | 'new_message'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  body: string
  link: string
  metadata?: Record<string, unknown>
}

/**
 * Insert a single notification for one user. Uses the service client because
 * the notifications table intentionally has no INSERT policy — notifications
 * are only ever created server-side.
 */
export async function createNotification(params: CreateNotificationParams) {
  const svcClient = createServiceClient()
  const { error } = await svcClient.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    link: params.link,
    metadata: (params.metadata || {}) as never,
  })
  if (error) {
    logger.error('Failed to create notification', new Error(error.message), {
      notificationType: params.type,
      targetUserId: params.userId,
    })
  }
}

/**
 * Fan out a notification to every active member of a group except the excluded
 * user (typically the actor who triggered the event).
 */
export async function createNotificationsForGroupMembers(
  groupId: string,
  excludeUserId: string,
  notification: Omit<CreateNotificationParams, 'userId'>
) {
  const svcClient = createServiceClient()
  const { data: members } = await svcClient
    .from('co_renter_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('status', 'active')
    .neq('user_id', excludeUserId)

  if (!members || members.length === 0) return

  const notifications = members.map((m) => ({
    user_id: m.user_id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    metadata: (notification.metadata || {}) as never,
  }))

  const { error } = await svcClient.from('notifications').insert(notifications)
  if (error) {
    logger.error('Failed to create group notifications', new Error(error.message), {
      notificationType: notification.type,
      groupId,
    })
  }
}
