import { useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useAuth } from '../../src/providers/auth-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../src/lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Send } from 'lucide-react-native'
import { useState } from 'react'

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

  // Fetch conversation details to get participant IDs
  const { data: conversation } = useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, participant_ids')
        .eq('id', id!)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id && !!user,
  })

  // Determine the other participant's user ID
  const otherUserId = conversation?.participant_ids?.find(
    (pid: string) => pid !== user?.id
  )

  // Fetch the other user's profile
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

  // Mark unread messages as read
  useEffect(() => {
    if (!messages || !user) return

    const unreadIds = messages
      .filter((m) => m.sender_id !== user.id && !m.read_at)
      .map((m) => m.id)

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
  }, [messages, user, queryClient])

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
            // Mark as read immediately since user is viewing the conversation
            supabase
              .from('messages')
              .update({ read_at: new Date().toISOString(), status: 'read' as const })
              .eq('id', payload.new.id)
              .then(() => {
                queryClient.invalidateQueries({ queryKey: ['conversations'] })
              })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, user, queryClient])

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
      queryClient.setQueryData<Message[]>(['messages', id], (old) => {
        if (!old) return [newMessage as Message]
        if (old.some((m) => m.id === newMessage.id)) return old
        return [...old, newMessage as Message]
      })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim()
    if (!trimmed || sendMutation.isPending) return
    setInputText('')
    sendMutation.mutate(trimmed)
  }, [inputText, sendMutation])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages?.length])

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

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isCurrentUser = item.sender_id === user?.id
    const showDateSeparator =
      index === 0 ||
      getDateKey(item.created_at) !==
        getDateKey(messages![index - 1].created_at)

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
        <View
          style={[
            styles.messageRow,
            isCurrentUser ? styles.messageRowRight : styles.messageRowLeft,
          ]}
        >
          {!isCurrentUser && (
            <View style={styles.messageBubbleAvatar}>
              <Text style={styles.messageBubbleAvatarText}>
                {(otherProfile?.name ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isCurrentUser ? styles.bubbleRight : styles.bubbleLeft,
            ]}
          >
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
        </View>
      </View>
    )
  }

  const headerTitle = otherProfile?.name ?? 'Conversation'

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
          headerStyle: { backgroundColor: '#ffffff' },
          headerTitleStyle: {
            color: '#0f172a',
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
    backgroundColor: '#f8fafc',
  },
  keyboardAvoid: {
    flex: 1,
  },
  backButton: {
    marginRight: 8,
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
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  messageTextLeft: {
    color: '#0f172a',
  },
  messageTextRight: {
    color: '#ffffff',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  messageTimeLeft: {
    color: '#94a3b8',
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
    backgroundColor: '#e2e8f0',
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
    marginHorizontal: 12,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: '#0f172a',
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
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
    color: '#64748b',
  },
  errorText: {
    fontSize: 15,
    color: '#dc2626',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
  },
})
