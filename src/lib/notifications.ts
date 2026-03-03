import { createServiceClient } from '@/lib/supabase/service'

export type NotificationType =
  | 'join_request_received'
  | 'join_request_accepted'
  | 'join_request_declined'
  | 'invitation_received'
  | 'member_joined'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  body: string
  link: string
  metadata?: Record<string, any>
}

export async function createNotification(params: CreateNotificationParams) {
  const svcClient = createServiceClient()
  const { error } = await (svcClient as any).from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    link: params.link,
    metadata: params.metadata || {},
  })
  if (error) {
    console.error('Failed to create notification:', error)
  }
}

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
    metadata: notification.metadata || {},
  }))

  const { error } = await (svcClient as any).from('notifications').insert(notifications)
  if (error) {
    console.error('Failed to create group notifications:', error)
  }
}
