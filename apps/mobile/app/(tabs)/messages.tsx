import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native'
import { useAuth } from '../../src/providers/auth-provider'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../src/lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

type Conversation = {
  conversation_id: string
  other_user_id: string
  other_user_name: string
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
      // Fetch conversations where the current user is a participant
      const { data: convos, error: convError } = await supabase
        .from('conversations')
        .select('id, participant_ids, last_message_at')
        .contains('participant_ids', [user!.id])
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (convError) throw convError
      if (!convos || convos.length === 0) return []

      const conversationIds = convos.map((c) => c.id)

      // Fetch latest message per conversation
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at, read_at, conversation_id')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })

      // Keep only the latest message per conversation
      const lastMessageByConvId = new Map<string, (typeof recentMessages extends (infer T)[] | null ? T : never)>()
      for (const msg of recentMessages ?? []) {
        if (!lastMessageByConvId.has(msg.conversation_id)) {
          lastMessageByConvId.set(msg.conversation_id, msg)
        }
      }

      // Count unread messages per conversation
      const unreadCountByConvId = new Map<string, number>()
      for (const msg of recentMessages ?? []) {
        if (msg.sender_id !== user!.id && !msg.read_at) {
          unreadCountByConvId.set(
            msg.conversation_id,
            (unreadCountByConvId.get(msg.conversation_id) ?? 0) + 1
          )
        }
      }

      // Collect other participant IDs
      const otherUserIds = convos
        .map((c) => c.participant_ids.find((pid: string) => pid !== user!.id))
        .filter(Boolean) as string[]

      const uniqueOtherIds = [...new Set(otherUserIds)]

      // Fetch profiles for other participants
      const { data: profiles } = uniqueOtherIds.length > 0
        ? await supabase
            .from('profiles')
            .select('user_id, name, profile_photo')
            .in('user_id', uniqueOtherIds)
        : { data: [] }

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p.name ?? 'Unknown User'])
      )

      // Build the conversation list
      const result: Conversation[] = convos.map((conv) => {
        const otherUserId = conv.participant_ids.find(
          (pid: string) => pid !== user!.id
        ) ?? ''
        const lastMsg = lastMessageByConvId.get(conv.id)

        return {
          conversation_id: conv.id,
          other_user_id: otherUserId,
          other_user_name: profileMap.get(otherUserId) ?? 'Unknown User',
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
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const renderConversation = ({ item }: { item: Conversation }) => (
    <Pressable
      style={({ pressed }) => [
        styles.conversationCard,
        pressed && styles.conversationCardPressed,
      ]}
      onPress={() => router.push(`/conversation/${item.conversation_id}`)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.other_user_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text
            style={[
              styles.userName,
              item.unread_count > 0 && styles.userNameUnread,
            ]}
            numberOfLines={1}
          >
            {item.other_user_name}
          </Text>
          <Text style={styles.timestamp}>{formatTime(item.last_message_at)}</Text>
        </View>
        <View style={styles.lastMessageRow}>
          <Text
            style={[
              styles.lastMessage,
              item.unread_count > 0 && styles.lastMessageUnread,
            ]}
            numberOfLines={1}
          >
            {item.last_message}
          </Text>
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  )

  return (
    <SafeAreaView testID="screen-messages" style={styles.container} edges={['bottom']}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            Failed to load messages. Please try again.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.conversation_id}
          renderItem={renderConversation}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>
                Start a conversation by messaging a listing owner.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    padding: 16,
  },
  conversationCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  conversationCardPressed: {
    backgroundColor: '#f1f5f9',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  userNameUnread: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
    color: '#94a3b8',
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    flex: 1,
  },
  lastMessageUnread: {
    color: '#0f172a',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorText: {
    fontSize: 15,
    color: '#dc2626',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
})
