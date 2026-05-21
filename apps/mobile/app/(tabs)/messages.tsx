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
import { Screen, Avatar, Badge } from '@/components/ui'
import { colors, radii, shadows, typography } from '@/theme/tokens'

type Conversation = {
  conversation_id: string
  other_user_id: string
  other_user_name: string
  other_user_photo: string | null
  last_message: string
  last_message_at: string
  unread_count: number
}

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
      const { data: convos, error: convError } = await supabase
        .from('conversations')
        .select('id, participant_ids, last_message_at')
        .contains('participant_ids', [user!.id])
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (convError) throw convError
      if (!convos || convos.length === 0) return []

      const conversationIds = convos.map((c) => c.id)

      const { data: recentMessages } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at, read_at, conversation_id')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })

      const lastMessageByConvId = new Map<string, (typeof recentMessages extends (infer T)[] | null ? T : never)>()
      for (const msg of recentMessages ?? []) {
        if (!lastMessageByConvId.has(msg.conversation_id)) {
          lastMessageByConvId.set(msg.conversation_id, msg)
        }
      }

      const unreadCountByConvId = new Map<string, number>()
      for (const msg of recentMessages ?? []) {
        if (msg.sender_id !== user!.id && !msg.read_at) {
          unreadCountByConvId.set(
            msg.conversation_id,
            (unreadCountByConvId.get(msg.conversation_id) ?? 0) + 1
          )
        }
      }

      const otherUserIds = convos
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

      const result: Conversation[] = convos.map((conv) => {
        const otherUserId = conv.participant_ids.find(
          (pid: string) => pid !== user!.id
        ) ?? ''
        const lastMsg = lastMessageByConvId.get(conv.id)
        const profile = profileMap.get(otherUserId)

        return {
          conversation_id: conv.id,
          other_user_id: otherUserId,
          other_user_name: profile?.name ?? 'Unknown User',
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
              <Avatar src={item.other_user_photo} name={item.other_user_name} size={48} />
              <View style={styles.rowMid}>
                <View style={styles.rowHeader}>
                  <Text style={[styles.rowName, item.unread_count > 0 && styles.rowNameUnread]} numberOfLines={1}>
                    {item.other_user_name}
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
  rowMid: { flex: 1 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowName: { fontFamily: typography.fontFamily.bodyMedium, fontSize: 14, color: colors.primary, flex: 1, marginRight: 8 },
  rowNameUnread: { fontFamily: typography.fontFamily.bodyBold },
  time: { fontFamily: typography.fontFamily.body, fontSize: 11, color: colors.outline },
  rowPreview: { fontFamily: typography.fontFamily.body, fontSize: 13, color: colors.onSurfaceVariant, marginTop: 2 },
  rowPreviewUnread: { color: colors.onSurface, fontFamily: typography.fontFamily.bodyMedium },
})
