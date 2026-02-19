'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { clientLogger } from '@/lib/client-logger'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate, getRelativeTime, formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { VerificationBadge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Send,
  Loader2,
  Users,
  Home,
  MapPin,
  MoreVertical,
  Flag,
  Ban,
  Check,
  CheckCheck,
} from 'lucide-react'
import { ReportModal } from '@/components/ui/report-modal'
import { ConfirmModal } from '@/components/ui/modal'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  read_at: string | null
  status: 'sent' | 'delivered' | 'read'
  created_at: string
  attachment_url?: string | null
  attachment_type?: 'image' | 'video' | 'document' | 'gif' | null
  attachment_name?: string | null
}

interface Conversation {
  id: string
  participant_ids: string[]
  listing_id: string | null
  other_profile: {
    id: string
    user_id: string
    name: string | null
    profile_photo: string | null
    verification_level: 'basic' | 'verified' | 'trusted'
    bio: string | null
  } | null
  listings: {
    id: string
    title: string
    photos: string[]
    price: number
    city: string
    province: string
  } | null
}

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const conversationId = params.id as string

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [isBlocking, setIsBlocking] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const mergeMessages = (existing: Message[], incoming: Message[]) => {
    const byId = new Map<string, Message>()
    for (const msg of existing) byId.set(msg.id, msg)
    for (const msg of incoming) byId.set(msg.id, msg)

    return Array.from(byId.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null

    async function loadConversation() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/messages')
        return
      }

      setCurrentUserId(user.id)

      // Load conversation details
      const convResponse = await fetch(`/api/conversations/${conversationId}`)
      const convData = await convResponse.json()

      if (!convResponse.ok) {
        router.push('/messages')
        return
      }

      setConversation(convData.conversation)

      // Load messages
      const msgResponse = await fetch(`/api/conversations/${conversationId}/messages`)
      const msgData = await msgResponse.json()

      if (msgResponse.ok) {
        setMessages((prev) => mergeMessages(prev, msgData.messages || []))
      }

      setIsLoading(false)

      // Set up real-time subscription
      channel = supabase
        .channel(`chat-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message

            setMessages((prev) => mergeMessages(prev, [newMsg]))

            // Mark as read since it's from the other user
            if (newMsg.sender_id !== user.id) {
              fetch(`/api/messages/${newMsg.id}/read`, { method: 'PUT' })
            }
          }
        )
        .subscribe()
    }

    loadConversation()

    return () => {
      if (channel) {
        const supabase = createClient()
        supabase.removeChannel(channel)
      }
    }
  }, [conversationId, router])

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return

    setSendError(null)
    setIsSending(true)
    const messageContent = newMessage.trim()
    setNewMessage('')

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: currentUserId!,
      content: messageContent,
      read_at: null,
      status: 'sent',
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => mergeMessages(prev, [optimisticMessage]))

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageContent }),
      })

      if (!response.ok) {
        let errorMessage = 'Failed to send message'
        try {
          const errData = await response.json()
          if (typeof errData?.error === 'string') {
            errorMessage = errData.error
          }
        } catch {}

        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id))
        setNewMessage(messageContent)
        setSendError(errorMessage)
      } else {
        // Success - reconcile optimistic message with persisted message id.
        const data = await response.json()
        if (data.message) {
          setMessages((prev) => {
            const withoutTemp = prev.filter((m) => m.id !== optimisticMessage.id)
            return mergeMessages(withoutTemp, [data.message])
          })
        }
      }
    } catch {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id))
      setNewMessage(messageContent)
      setSendError('Failed to send message. Please try again.')
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleBlockUser = async () => {
    if (!conversation?.other_profile?.user_id) return

    setIsBlocking(true)

    try {
      const response = await fetch('/api/blocked-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: conversation.other_profile.user_id }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to block user')
      }

      // Redirect to messages list after blocking
      router.push('/messages')
    } catch (err) {
      clientLogger.error('Block error', err)
      setIsBlocking(false)
      setShowBlockConfirm(false)
    }
  }

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = []
    let currentDate = ''

    messages.forEach((message) => {
      const messageDate = new Date(message.created_at).toLocaleDateString()
      if (messageDate !== currentDate) {
        currentDate = messageDate
        groups.push({ date: messageDate, messages: [message] })
      } else {
        groups[groups.length - 1].messages.push(message)
      }
    })

    return groups
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!conversation) {
    return null
  }

  const messageGroups = groupMessagesByDate(messages)

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] h-[calc(100dvh-64px)]">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link
            href="/messages"
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>

          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
              {conversation.other_profile?.profile_photo ? (
                <img
                  src={conversation.other_profile.profile_photo}
                  alt={conversation.other_profile.name || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="h-5 w-5 text-blue-600" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-gray-900 truncate">
                  {conversation.other_profile?.name || 'Anonymous'}
                </h1>
                <VerificationBadge
                  level={conversation.other_profile?.verification_level || 'basic'}
                  size="sm"
                  showLabel={false}
                />
              </div>
              {conversation.listings && (
                <p className="text-xs text-gray-500 truncate">
                  Re: {conversation.listings.title}
                </p>
              )}
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-gray-600" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <Link
                    href={`/profile/${conversation.other_profile?.user_id}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowMenu(false)}
                  >
                    <Users className="h-4 w-4" />
                    View Profile
                  </Link>
                  <button
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                    onClick={() => {
                      setShowMenu(false)
                      setShowReportModal(true)
                    }}
                  >
                    <Flag className="h-4 w-4" />
                    Report User
                  </button>
                  <button
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full"
                    onClick={() => {
                      setShowMenu(false)
                      setShowBlockConfirm(true)
                    }}
                  >
                    <Ban className="h-4 w-4" />
                    Block User
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Listing context card */}
      {conversation.listings && (
        <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <Link href={`/listings/${conversation.listings.id}`}>
              <Card variant="bordered" className="hover:bg-white transition-colors">
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                      {conversation.listings.photos?.[0] ? (
                        <img
                          src={conversation.listings.photos[0]}
                          alt={conversation.listings.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm truncate">
                        {conversation.listings.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />
                        <span>
                          {conversation.listings.city}, {conversation.listings.province}
                        </span>
                        <span className="text-blue-600 font-medium">
                          {formatPrice(conversation.listings.price)}/mo
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            messageGroups.map((group) => (
              <div key={group.date}>
                {/* Date divider */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">
                    {new Date(group.date).toLocaleDateString('en-CA', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Messages */}
                <div className="space-y-3">
                  {group.messages.map((message) => {
                    const isOwn = message.sender_id === currentUserId
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`
                            max-w-[75%] px-4 py-2.5 rounded-2xl
                            ${
                              isOwn
                                ? 'bg-blue-600 text-white rounded-br-md'
                                : 'bg-gray-100 text-gray-900 rounded-bl-md'
                            }
                          `}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwn ? 'text-blue-200' : 'text-gray-400'
                            }`}
                          >
                            {new Date(message.created_at).toLocaleTimeString('en-CA', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                            {isOwn && (
                              <span className="ml-2 inline-flex items-center">
                                {message.status === 'read' ? (
                                  <CheckCheck className="h-3.5 w-3.5 text-blue-300" />
                                ) : message.status === 'delivered' ? (
                                  <CheckCheck className="h-3.5 w-3.5" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3 pb-[env(safe-area-inset-bottom,12px)]">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value)
              if (sendError) setSendError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none px-4 py-2.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 text-base"
            style={{
              minHeight: '44px',
              height: 'auto',
              fontSize: '16px', // Prevents iOS zoom on focus
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 128) + 'px'
            }}
            onFocus={() => {
              // Scroll to bottom when keyboard opens on mobile
              setTimeout(() => scrollToBottom(), 300)
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="rounded-full w-11 h-11 p-0 flex-shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        {sendError && (
          <div className="max-w-3xl mx-auto mt-2 text-sm text-red-600">
            {sendError}
          </div>
        )}
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportedUserId={conversation.other_profile?.user_id}
        reportedName={conversation.other_profile?.name || 'User'}
      />

      {/* Block Confirmation Modal */}
      <ConfirmModal
        isOpen={showBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        onConfirm={handleBlockUser}
        title={`Block ${conversation.other_profile?.name || 'User'}?`}
        message="They won't be able to message you or see your listings. You can unblock them later in Settings."
        confirmText="Block User"
        variant="danger"
        isLoading={isBlocking}
      />
    </div>
  )
}
