import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useAuth } from '../../src/providers/auth-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../src/lib/supabase'
import { promptBlock, promptReport } from '../../src/lib/api'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, MoreVertical, Send } from 'lucide-react-native'
import { Avatar } from '@/components/ui'
import { colors, radii, typography } from '@/theme/tokens'

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
  status: string
}

type Profile = {
  user_id: string
  name: string | null
  profile_photo: string | null
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const flatListRef = useRef<FlatList>(null)
  const [inputText, setInputText] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)

  // Fetch conversation details to get participant IDs and group linkage
  const { data: conversation } = useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, participant_ids, group_id')
        .eq('id', id!)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id && !!user,
  })

  const groupId = conversation?.group_id ?? null
  const isGroup = !!groupId

  // Group name for the header (group conversations only)
  const { data: group } = useQuery({
    queryKey: ['group-name', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('co_renter_groups')
        .select('id, name')
        .eq('id', groupId!)
        .single()
      if (error) throw error
      return data as { id: string; name: string }
    },
    enabled: isGroup,
  })

  // Determine the other participant's user ID (1:1 only)
  const otherUserId = isGroup
    ? undefined
    : conversation?.participant_ids?.find((pid: string) => pid !== user?.id)

  // Fetch the other user's profile (1:1 only)
  const { data: otherProfile } = useQuery({
    queryKey: ['profile', otherUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, profile_photo')
        .eq('user_id', otherUserId!)
        .single()

      if (error) throw error
      return data as Profile
    },
    enabled: !!otherUserId,
  })

  // Fetch messages
  const {
    data: messages,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['messages', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, created_at, read_at, status')
        .eq('conversation_id', id!)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as Message[]
    },
    enabled: !!id && !!user,
  })

  // Batch-fetch sender profiles for group conversations so each message can
  // show the sender's name + avatar. Keyed on the set of sender ids present.
  const senderIds = isGroup
    ? [...new Set((messages ?? []).map((m) => m.sender_id).filter((sid) => sid !== user?.id))]
    : []
  const { data: senderProfiles } = useQuery({
    queryKey: ['group-senders', id, senderIds.slice().sort().join(',')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, profile_photo')
        .in('user_id', senderIds)
      if (error) throw error
      const map = new Map<string, Profile>()
      for (const p of (data ?? []) as Profile[]) map.set(p.user_id, p)
      return map
    },
    enabled: isGroup && senderIds.length > 0,
  })

  // Identity of the unread set, not of the array: react-query hands back a new
  // array on every refetch, so depending on `messages` re-ran the update on
  // every render. This only changes when the ids actually change.
  const unreadKey = useMemo(
    () =>
      (messages ?? [])
        .filter((m) => m.sender_id !== user?.id && !m.read_at)
        .map((m) => m.id)
        .join(','),
    [messages, user?.id]
  )
  const latestMessageId = messages && messages.length > 0 ? messages[messages.length - 1].id : null

  // Mark unread messages as read. Group read state is per-member
  // (co_renter_members.last_read_at, from migration 027) — messages.read_at is
  // a single shared column, so writing it in a group chat would mark messages
  // read for every other member too.
  useEffect(() => {
    if (!user) return

    if (isGroup) {
      if (!groupId || !latestMessageId) return
      supabase
        .from('co_renter_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
        })
      return
    }

    const unreadIds = unreadKey ? unreadKey.split(',') : []

    if (unreadIds.length > 0) {
      supabase
        .from('messages')
        .update({ read_at: new Date().toISOString(), status: 'read' as const })
        .in('id', unreadIds)
        .then(() => {
          // Invalidate conversation list to update unread indicators
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
        })
    }
  }, [unreadKey, latestMessageId, user, queryClient, isGroup, groupId])

  // Real-time subscription for new messages
  useEffect(() => {
    if (!id || !user) return

    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          // Only process messages from other users to avoid duplicating our own
          if (payload.new.sender_id !== user.id) {
            queryClient.setQueryData<Message[]>(['messages', id], (old) => {
              if (!old) return [payload.new as Message]
              if (old.some((m) => m.id === payload.new.id)) return old
              return [...old, payload.new as Message]
            })
            // Mark as read immediately since user is viewing the conversation.
            // Group chats track per-member read state on co_renter_members
            // instead of the shared messages.read_at column.
            if (groupId) {
              supabase
                .from('co_renter_members')
                .update({ last_read_at: new Date().toISOString() })
                .eq('group_id', groupId)
                .eq('user_id', user.id)
                .then(() => {
                  queryClient.invalidateQueries({ queryKey: ['conversations'] })
                })
            } else {
              supabase
                .from('messages')
                .update({ read_at: new Date().toISOString(), status: 'read' as const })
                .eq('id', payload.new.id)
                .then(() => {
                  queryClient.invalidateQueries({ queryKey: ['conversations'] })
                })
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, user, queryClient, groupId])

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: id!,
          sender_id: user!.id,
          content,
        })
        .select()
        .single()

      if (error) throw error

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', id!)

      return data
    },
    onSuccess: (newMessage) => {
      setSendError(null)
      queryClient.setQueryData<Message[]>(['messages', id], (old) => {
        if (!old) return [newMessage as Message]
        if (old.some((m) => m.id === newMessage.id)) return old
        return [...old, newMessage as Message]
      })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    // The send used to fail silently with the message already wiped from the
    // composer. Put the text back so nothing typed is ever lost.
    onError: (err: unknown, content: string) => {
      setInputText((current) => (current.trim() ? current : content))
      setSendError(
        err instanceof Error && err.message
          ? err.message
          : 'Message not sent. Check your connection and try again.'
      )
    },
  })

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim()
    if (!trimmed || sendMutation.isPending) return
    setSendError(null)
    setInputText('')
    sendMutation.mutate(trimmed)
  }, [inputText, sendMutation])

  // Scroll to bottom when a new message arrives
  useEffect(() => {
    if (!latestMessageId) return
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)
    return () => clearTimeout(timer)
  }, [latestMessageId])

  const formatTime = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return date.toLocaleDateString([], {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }

  // Group messages to show date separators
  const getDateKey = (dateStr: string) => new Date(dateStr).toDateString()

  // Group chats have no single "other user", so the header safety menu below is
  // hidden for them. Long-pressing another member's message is the per-sender
  // equivalent — App Store review requires report/block to be reachable from
  // every surface that shows user-generated content.
  const openSenderSafetyMenu = useCallback(
    (senderId: string, senderName: string | null) => {
      if (!senderId || senderId === user?.id) return
      const subject = senderName?.trim() || 'this person'
      Alert.alert(subject, 'What would you like to do?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report user', onPress: () => promptReport({ userId: senderId }, subject) },
        {
          text: 'Block user',
          style: 'destructive',
          onPress: () =>
            promptBlock(senderId, subject, () => {
              queryClient.invalidateQueries({ queryKey: ['conversations'] })
              queryClient.invalidateQueries({ queryKey: ['messages', id] })
            }),
        },
      ])
    },
    [user?.id, queryClient, id]
  )

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isCurrentUser = item.sender_id === user?.id
    const showDateSeparator =
      index === 0 ||
      getDateKey(item.created_at) !==
        getDateKey(messages![index - 1].created_at)

    const senderProfile = isGroup ? senderProfiles?.get(item.sender_id) : otherProfile
    // In a group, only label the sender when this is the first message in a run
    // from that sender (keeps consecutive messages clean).
    const showSenderName =
      isGroup &&
      !isCurrentUser &&
      (index === 0 || messages![index - 1].sender_id !== item.sender_id)

    // In a group, a long press on someone else's message opens report/block.
    const canModerateSender = isGroup && !isCurrentUser && !!item.sender_id
    const rowStyle = [
      styles.messageRow,
      isCurrentUser ? styles.messageRowRight : styles.messageRowLeft,
    ]

    const rowBody = (
      <>
        {!isCurrentUser &&
            (senderProfile?.profile_photo ? (
              <Avatar
                src={senderProfile.profile_photo}
                name={senderProfile.name}
                size={28}
                style={styles.messageBubbleAvatar}
              />
            ) : (
              <View style={styles.messageBubbleAvatar}>
                <Text style={styles.messageBubbleAvatarText}>
                  {(senderProfile?.name ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            ))}
          <View
            style={[
              styles.messageBubble,
              isCurrentUser ? styles.bubbleRight : styles.bubbleLeft,
            ]}
          >
            {showSenderName ? (
              <Text style={styles.senderName}>
                {senderProfile?.name ?? 'Member'}
              </Text>
            ) : null}
            <Text
              style={[
                styles.messageText,
                isCurrentUser ? styles.messageTextRight : styles.messageTextLeft,
              ]}
            >
              {item.content}
            </Text>
            <Text
              style={[
                styles.messageTime,
                isCurrentUser
                  ? styles.messageTimeRight
                  : styles.messageTimeLeft,
              ]}
            >
              {formatTime(item.created_at)}
            </Text>
          </View>
      </>
    )

    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>
              {formatDateSeparator(item.created_at)}
            </Text>
            <View style={styles.dateLine} />
          </View>
        )}
        {canModerateSender ? (
          <Pressable
            style={rowStyle}
            onLongPress={() =>
              openSenderSafetyMenu(item.sender_id, senderProfile?.name ?? null)
            }
            delayLongPress={350}
            accessibilityHint="Long press to report or block this member"
          >
            {rowBody}
          </Pressable>
        ) : (
          <View style={rowStyle}>{rowBody}</View>
        )}
      </View>
    )
  }

  const headerTitle = isGroup
    ? group?.name ?? 'Group chat'
    : otherProfile?.name ?? 'Conversation'

  // Safety menu for 1:1 chats — App Store review requires reporting and
  // blocking to be reachable from anywhere user-generated content is shown.
  const openSafetyMenu = useCallback(() => {
    if (!otherUserId) return
    const subject = otherProfile?.name ?? 'this person'
    Alert.alert(subject, 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', onPress: () => promptReport({ userId: otherUserId }, subject) },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () =>
          promptBlock(otherUserId, subject, () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
            router.back()
          }),
      },
    ])
  }, [otherUserId, otherProfile?.name, queryClient, router])

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerTitle: headerTitle,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={24} color="#0f172a" />
            </TouchableOpacity>
          ),
          headerRight: () =>
            otherUserId ? (
              <TouchableOpacity
                onPress={openSafetyMenu}
                style={styles.headerMenuButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Report or block this person"
              >
                <MoreVertical size={22} color={colors.primary} />
              </TouchableOpacity>
            ) : null,
          headerStyle: { backgroundColor: colors.surfaceContainerLowest },
          headerTitleStyle: {
            color: colors.primary,
            fontWeight: '600',
            fontSize: 17,
          },
          headerShadowVisible: false,
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>
              Failed to load messages. Please try again.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: false })
            }}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.emptyText}>
                  No messages yet. Say hello!
                </Text>
              </View>
            }
          />
        )}

        {sendError ? (
          <View style={styles.sendErrorBanner}>
            <Text style={styles.sendErrorText}>{sendError}</Text>
          </View>
        ) : null}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={5000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sendMutation.isPending) &&
                styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sendMutation.isPending}
            activeOpacity={0.7}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Send size={20} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  headerMenuButton: {
    marginLeft: 8,
    padding: 4,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  messageBubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubbleAvatarText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleLeft: {
    backgroundColor: colors.surfaceContainerLow,
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  messageTextLeft: {
    color: colors.primary,
  },
  messageTextRight: {
    color: colors.surfaceContainerLowest,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  messageTimeLeft: {
    color: colors.outline,
  },
  messageTimeRight: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
  },
  dateText: {
    fontSize: 12,
    color: colors.outline,
    marginHorizontal: 12,
    fontWeight: '500',
  },
  sendErrorBanner: {
    backgroundColor: colors.errorContainer,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sendErrorText: {
    fontSize: 13,
    color: colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: colors.primary,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#93c5fd',
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
    color: colors.onSurfaceVariant,
  },
  errorText: {
    fontSize: 15,
    color: colors.error,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.outline,
    textAlign: 'center',
  },
})
