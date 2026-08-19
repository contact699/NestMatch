import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useAuth } from '@/providers/auth-provider'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'expo-router'
import { Users } from 'lucide-react-native'
import { Screen, Avatar, Badge } from '@/components/ui'
import { colors, radii, shadows, typography } from '@/theme/tokens'

type Conversation = {
  conversation_id: string
  is_group: boolean
  /** Group name for a group chat, the other participant's name otherwise. */
  title: string
  other_user_id: string
  other_user_photo: string | null
  last_message: string
  last_message_at: string
  unread_count: number
}

// Bounds on a screen that previously fetched every message of every
// conversation the user is in.
const MAX_CONVERSATIONS = 50
const MAX_RECENT_MESSAGES = 500

export default function MessagesScreen() {
  const { user } = useAuth()
  const router = useRouter()

  const {
    data: conversations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      // Group chats are authorized by group_id + membership, not participant_ids:
      // the web route POST /api/groups/[id]/chat/init deliberately creates them
      // with `participant_ids: []` (migration 032 scopes the participant_ids
      // policies to group_id IS NULL). Filtering on participant_ids alone made
      // every web-created group thread invisible here, so pull the caller's
      // active groups first and match on group_id as well.
      //
      // last_read_at comes along for the ride — it is the group equivalent of
      // messages.read_at and drives the unread counts below.
      const { data: memberships } = await supabase
        .from('co_renter_members')
        .select('group_id, last_read_at')
        .eq('user_id', user!.id)
        .eq('status', 'active')

      const lastReadByGroupId = new Map<string, string | null>()
      for (const m of (memberships ?? []) as { group_id: string; last_read_at: string | null }[]) {
        lastReadByGroupId.set(m.group_id, m.last_read_at)
      }
      const myGroupIds = [...lastReadByGroupId.keys()]

      // RLS still has the final say on both branches; this only widens what we ask for.
      const orFilters = [`participant_ids.cs.{${user!.id}}`]
      if (myGroupIds.length > 0) {
        orFilters.push(`group_id.in.(${myGroupIds.join(',')})`)
      }

      const { data: convos, error: convError } = await supabase
        .from('conversations')
        .select('id, participant_ids, last_message_at, group_id')
        .or(orFilters.join(','))
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(MAX_CONVERSATIONS)

      if (convError) throw convError
      if (!convos || convos.length === 0) return []

      const conversationIds = convos.map((c) => c.id)
      const convById = new Map(convos.map((c) => [c.id, c]))

      const { data: recentMessages } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at, read_at, conversation_id')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
        .limit(MAX_RECENT_MESSAGES)

      const lastMessageByConvId = new Map<string, (typeof recentMessages extends (infer T)[] | null ? T : never)>()
      for (const msg of recentMessages ?? []) {
        if (!lastMessageByConvId.has(msg.conversation_id)) {
          lastMessageByConvId.set(msg.conversation_id, msg)
        }
      }

      // Unread has two sources of truth. 1:1 threads use messages.read_at.
      // Group threads never write it (it is a single shared column — marking it
      // would mark the message read for every other member), so their read state
      // lives on co_renter_members.last_read_at, written by conversation/[id].tsx.
      // Counting groups off read_at left a badge that could never clear.
      const unreadCountByConvId = new Map<string, number>()
      for (const msg of recentMessages ?? []) {
        if (msg.sender_id === user!.id) continue

        const conv = convById.get(msg.conversation_id)
        if (!conv) continue

        if (conv.group_id) {
          const lastReadAt = lastReadByGroupId.get(conv.group_id)
          // No last_read_at yet = never opened the chat, so everything is unread.
          if (lastReadAt && new Date(msg.created_at) <= new Date(lastReadAt)) continue
        } else if (msg.read_at) {
          continue
        }

        unreadCountByConvId.set(
          msg.conversation_id,
          (unreadCountByConvId.get(msg.conversation_id) ?? 0) + 1
        )
      }

      // A conversation is a group chat when it is linked to a co-renter group,
      // or when more than two people are in it. Those rows have no single
      // "other user", which is why they used to render as "Unknown User".
      const isGroupConv = (conv: { group_id: string | null; participant_ids: string[] }) =>
        !!conv.group_id || (conv.participant_ids?.length ?? 0) > 2

      const otherUserIds = convos
        .filter((c) => !isGroupConv(c))
        .map((c) => c.participant_ids.find((pid: string) => pid !== user!.id))
        .filter(Boolean) as string[]

      const uniqueOtherIds = [...new Set(otherUserIds)]

      const { data: profiles } = uniqueOtherIds.length > 0
        ? await supabase
            .from('profiles')
            .select('user_id, name, profile_photo')
            .in('user_id', uniqueOtherIds)
        : { data: [] }

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, { name: p.name ?? 'Unknown User', photo: p.profile_photo as string | null }])
      )

      const groupIds = [...new Set(convos.map((c) => c.group_id).filter(Boolean) as string[])]
      const { data: groups } = groupIds.length > 0
        ? await supabase.from('co_renter_groups').select('id, name').in('id', groupIds)
        : { data: [] }
      const groupNameById = new Map(
        (groups ?? []).map((g) => [g.id as string, (g.name as string | null) ?? 'Group chat'])
      )

      const result: Conversation[] = convos.map((conv) => {
        const lastMsg = lastMessageByConvId.get(conv.id)
        const isGroup = isGroupConv(conv)
        const otherUserId = isGroup
          ? ''
          : conv.participant_ids.find((pid: string) => pid !== user!.id) ?? ''
        const profile = isGroup ? undefined : profileMap.get(otherUserId)
        const memberCount = conv.participant_ids?.length ?? 0

        return {
          conversation_id: conv.id,
          is_group: isGroup,
          title: isGroup
            ? (conv.group_id ? groupNameById.get(conv.group_id) : null) ??
              (memberCount > 0 ? `Group chat · ${memberCount} people` : 'Group chat')
            : profile?.name ?? 'Unknown User',
          other_user_id: otherUserId,
          other_user_photo: profile?.photo ?? null,
          last_message: lastMsg?.content ?? '',
          last_message_at: lastMsg?.created_at ?? conv.last_message_at ?? '',
          unread_count: unreadCountByConvId.get(conv.id) ?? 0,
        }
      })

      return result
    },
    enabled: !!user,
  })

  const formatTime = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' })
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <Screen testID="screen-messages" edges={['bottom']}>
      <View style={styles.head}>
        <Text style={styles.title}>Messages</Text>
      </View>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load conversations.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations ?? []}
          keyExtractor={(c) => c.conversation_id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyBody}>
                Start one by tapping a listing or roommate profile.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/conversation/${item.conversation_id}`)}
            >
              {item.is_group ? (
                <View style={styles.groupAvatar}>
                  <Users size={22} color={colors.primary} />
                </View>
              ) : (
                <Avatar src={item.other_user_photo} name={item.title} size={48} />
              )}
              <View style={styles.rowMid}>
                <View style={styles.rowHeader}>
                  <Text style={[styles.rowName, item.unread_count > 0 && styles.rowNameUnread]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.time}>{formatTime(item.last_message_at)}</Text>
                </View>
                <Text style={[styles.rowPreview, item.unread_count > 0 && styles.rowPreviewUnread]} numberOfLines={1}>
                  {item.last_message || 'No messages yet'}
                </Text>
              </View>
              {item.unread_count > 0 ? (
                <Badge variant="success">{item.unread_count > 99 ? '99+' : `${item.unread_count}`}</Badge>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  head: { padding: 20, paddingBottom: 8 },
  title: {
    fontFamily: typography.fontFamily.display,
    fontSize: 26,
    color: colors.primary,
    letterSpacing: -0.3,
  },
  list: { padding: 20, paddingTop: 4, gap: 8 },
  center: { padding: 40, alignItems: 'center' },
  errorText: { fontFamily: typography.fontFamily.body, fontSize: 14, color: colors.error },
  emptyTitle: { fontFamily: typography.fontFamily.bodyBold, fontSize: 15, color: colors.primary, marginBottom: 4 },
  emptyBody: { fontFamily: typography.fontFamily.body, fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.lg,
    padding: 12,
    ...shadows.sm,
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMid: { flex: 1 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowName: { fontFamily: typography.fontFamily.bodyMedium, fontSize: 14, color: colors.primary, flex: 1, marginRight: 8 },
  rowNameUnread: { fontFamily: typography.fontFamily.bodyBold },
  time: { fontFamily: typography.fontFamily.body, fontSize: 11, color: colors.outline },
  rowPreview: { fontFamily: typography.fontFamily.body, fontSize: 13, color: colors.onSurfaceVariant, marginTop: 2 },
  rowPreviewUnread: { color: colors.onSurface, fontFamily: typography.fontFamily.bodyMedium },
})
