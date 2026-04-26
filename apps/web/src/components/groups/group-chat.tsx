'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clientLogger } from '@/lib/client-logger'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EMOJI_CATEGORIES } from '@/lib/chat/emojis'
import { Send, Smile, Loader2, MessageCircle } from 'lucide-react'

interface GroupChatProps {
  groupId: string
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

interface MemberSummary {
  user_id: string
  name: string | null
  profile_photo: string | null
}

export function GroupChat({ groupId }: GroupChatProps) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<Record<string, MemberSummary>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [lastReadAt, setLastReadAt] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Smileys')

  const messageListRef = useRef<HTMLDivElement>(null)
  const initialLoadDone = useRef(false)

  // Mark this user's last_read_at = now() server-side. Fire-and-forget.
  const markRead = useCallback(async () => {
    try {
      await fetch(`/api/groups/${groupId}/chat/read`, { method: 'POST' })
    } catch (err) {
      clientLogger.error('group-chat: mark read failed', err)
    }
  }, [groupId])

  // Initial load: who am I, who are the members, what's the conversation, what messages exist
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const { data: userRes } = await supabase.auth.getUser()
        if (cancelled) return
        const userId = userRes.user?.id ?? null
        setCurrentUserId(userId)
        if (!userId) {
          setError('Sign in to chat')
          setIsLoading(false)
          return
        }

        // Lazy-create the group conversation server-side and grab my own
        // last_read_at while we're at it (used to draw the "new since" divider).
        const initRes = await fetch(`/api/groups/${groupId}/chat/init`, { method: 'POST' })
        if (!initRes.ok) {
          const body = await initRes.json().catch(() => ({}))
          throw new Error(body?.error || `Init failed (${initRes.status})`)
        }
        const initJson = (await initRes.json()) as {
          conversationId: string
          lastReadAt: string | null
          members: MemberSummary[]
        }
        if (cancelled) return

        setConversationId(initJson.conversationId)
        setLastReadAt(initJson.lastReadAt)
        setMembers(
          Object.fromEntries(initJson.members.map((m) => [m.user_id, m])),
        )

        // Pull recent messages. RLS gates this to active group members.
        const { data: msgs, error: msgErr } = await supabase
          .from('messages')
          .select('id, conversation_id, sender_id, content, created_at')
          .eq('conversation_id', initJson.conversationId)
          .order('created_at', { ascending: true })
          .limit(200)
        if (cancelled) return

        if (msgErr) throw msgErr
        setMessages(msgs ?? [])
        initialLoadDone.current = true

        // Bump last_read_at on initial open
        void markRead()
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load chat')
          clientLogger.error('group-chat: load failed', err)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [groupId, markRead])

  // Real-time subscription to new messages for this conversation
  useEffect(() => {
    if (!conversationId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`group-chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Message
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]))

          // If the tab is visible and the message wasn't ours, mark read.
          if (document.visibilityState === 'visible' && m.sender_id !== currentUserId) {
            void markRead()
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId, markRead])

  // Re-mark-read whenever the user comes back to the tab
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible' && conversationId) {
        void markRead()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [conversationId, markRead])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!messageListRef.current) return
    messageListRef.current.scrollTop = messageListRef.current.scrollHeight
  }, [messages])

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault()
    const content = newMessage.trim()
    if (!content || isSending) return
    setIsSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/groups/${groupId}/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `Send failed (${res.status})`)
      }
      const { message } = (await res.json()) as { message: Message }
      // Optimistic add (real-time channel will dedupe by id)
      setMessages((prev) => (prev.some((p) => p.id === message.id) ? prev : [...prev, message]))
      setNewMessage('')
      setShowEmojiPicker(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed')
      clientLogger.error('group-chat: send failed', err)
    } finally {
      setIsSending(false)
    }
  }

  function senderLabel(senderId: string): string {
    if (senderId === currentUserId) return 'You'
    return members[senderId]?.name || 'Someone'
  }

  function formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  // Compute index where the unread divider should appear: first message
  // strictly newer than lastReadAt, and only if it's not our own and there
  // are unread messages above it.
  const dividerIndex = (() => {
    if (!lastReadAt) return -1
    const lastReadMs = Date.parse(lastReadAt)
    if (Number.isNaN(lastReadMs)) return -1
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i]
      if (m.sender_id === currentUserId) continue
      if (Date.parse(m.created_at) > lastReadMs) return i
    }
    return -1
  })()

  return (
    <Card variant="bordered" data-animate className="delay-300">
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-outline-variant/20 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-secondary" />
          <h2 className="font-display font-semibold text-on-surface">Group chat</h2>
          <span className="text-xs text-on-surface-variant ml-auto">
            {Object.keys(members).length} members
          </span>
        </div>

        {/* Message list */}
        <div
          ref={messageListRef}
          className="h-[420px] overflow-y-auto px-4 py-3 bg-surface-container-low"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-on-surface-variant" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-on-surface-variant">
              No messages yet — start the conversation.
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, i) => {
                const isMe = m.sender_id === currentUserId
                const showDivider = i === dividerIndex
                return (
                  <div key={m.id}>
                    {showDivider && (
                      <div className="flex items-center gap-2 my-3">
                        <div className="flex-1 h-px bg-secondary/30" />
                        <span className="text-[10px] font-medium uppercase tracking-wide text-secondary">
                          New since you last visited
                        </span>
                        <div className="flex-1 h-px bg-secondary/30" />
                      </div>
                    )}
                    <div className={isMe ? 'flex flex-col items-end' : 'flex flex-col items-start'}>
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-on-surface">
                          {senderLabel(m.sender_id)}
                        </span>
                        <span className="text-[10px] text-on-surface-variant">
                          {formatTime(m.created_at)}
                        </span>
                      </div>
                      <div
                        className={
                          isMe
                            ? 'bg-secondary text-on-secondary px-3 py-2 rounded-2xl rounded-tr-sm max-w-[80%] whitespace-pre-wrap break-words text-sm'
                            : 'bg-surface-container-lowest border border-outline-variant/20 text-on-surface px-3 py-2 rounded-2xl rounded-tl-sm max-w-[80%] whitespace-pre-wrap break-words text-sm'
                        }
                      >
                        {m.content}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={handleSend}
          className="px-3 py-2 border-t border-outline-variant/20 flex items-center gap-2 relative"
        >
          {showEmojiPicker && (
            <div className="absolute bottom-full left-2 right-2 mb-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3 shadow-lg z-10">
              <div className="flex gap-1 mb-2">
                {(Object.keys(EMOJI_CATEGORIES) as Array<keyof typeof EMOJI_CATEGORIES>).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEmojiCategory(cat)}
                      className={
                        cat === emojiCategory
                          ? 'text-xs px-2 py-1 rounded-md bg-secondary-container text-secondary font-medium'
                          : 'text-xs px-2 py-1 rounded-md text-on-surface-variant hover:bg-surface-container'
                      }
                    >
                      {cat}
                    </button>
                  ),
                )}
              </div>
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_CATEGORIES[emojiCategory].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setNewMessage((prev) => prev + emoji)
                    }}
                    className="text-xl p-1 rounded hover:bg-surface-container transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
            aria-label="Insert emoji"
          >
            <Smile className="h-5 w-5" />
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isLoading ? 'Loading…' : 'Message the group…'}
            disabled={isLoading || !conversationId}
            className="flex-1 px-3 py-2 ghost-border rounded-full focus:outline-none focus:ring-2 focus:ring-secondary bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant text-sm"
          />

          <Button
            type="submit"
            variant="primary"
            disabled={!newMessage.trim() || isSending || !conversationId}
            isLoading={isSending}
            className="rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {error && (
          <div className="px-4 py-2 text-xs text-error bg-error-container border-t border-outline-variant/20">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
