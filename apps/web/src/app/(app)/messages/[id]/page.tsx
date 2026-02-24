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
  Paperclip,
  Smile,
  Calendar as CalendarIcon,
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
    is_online?: boolean
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

const EMOJI_CATEGORIES: Record<string, string[]> = {
  'Smileys': ['😀', '😂', '🥹', '😊', '😍', '🤔', '😢', '😡', '🥳', '😎', '🤗', '😴', '🤮', '🫡', '🫠'],
  'Gestures': ['👍', '👎', '👋', '🤝', '✌️', '🤞', '💪', '👏', '🙌', '🤙', '🫶', '🙏', '✋', '🤚', '👊'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💖', '💗', '💘', '💝', '🔥', '✨'],
  'Objects': ['🏠', '🔑', '📦', '🛋️', '🚿', '🍳', '🧹', '💰', '📅', '📍', '🎉', '🎂', '🎁', '📸', '🎵'],
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
  const [isOnline, setIsOnline] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [eventForm, setEventForm] = useState({
    title: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    description: '',
  })
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [gifSearchQuery, setGifSearchQuery] = useState('')
  const [gifs, setGifs] = useState<Array<{ id: string; url: string; preview: string }>>([])
  const [isLoadingGifs, setIsLoadingGifs] = useState(false)
  const [otherUserOnline, setOtherUserOnline] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

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

      // Fetch current user's online status
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('is_online')
        .eq('user_id', user.id)
        .single()
      if (myProfile) setIsOnline(myProfile.is_online)

      // Load conversation details
      const convResponse = await fetch(`/api/conversations/${conversationId}`)
      const convData = await convResponse.json()

      if (!convResponse.ok) {
        router.push('/messages')
        return
      }

      setConversation(convData.conversation)

      if (convData.conversation?.other_profile?.is_online !== undefined) {
        setOtherUserOnline(convData.conversation.other_profile.is_online)
      }

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

    setShowEmojiPicker(false)
    setShowGifPicker(false)
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setSendError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload?bucket=chat-attachments', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const { url } = await response.json()

      // Determine attachment type
      let attachmentType: 'image' | 'video' | 'document' = 'document'
      if (file.type.startsWith('image/')) attachmentType = 'image'
      else if (file.type.startsWith('video/')) attachmentType = 'video'

      // Send as message with attachment
      const msgResponse = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '',
          attachment_url: url,
          attachment_type: attachmentType,
          attachment_name: file.name,
        }),
      })

      if (!msgResponse.ok) {
        const errData = await msgResponse.json()
        throw new Error(errData.error || 'Failed to send attachment')
      }

      const data = await msgResponse.json()
      if (data.message) {
        setMessages((prev) => mergeMessages(prev, [data.message]))
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const insertEmoji = (emoji: string) => {
    const textarea = inputRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = newMessage.substring(0, start) + emoji + newMessage.substring(end)
      setNewMessage(newValue)
      // Set cursor position after emoji
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length
        textarea.focus()
      }, 0)
    } else {
      setNewMessage((prev) => prev + emoji)
    }
  }

  const searchGifs = async (query: string) => {
    setIsLoadingGifs(true)
    try {
      const params = new URLSearchParams({ limit: '20' })
      if (query.trim()) params.set('q', query.trim())
      const res = await fetch(`/api/gifs?${params}`)
      const data = await res.json()
      setGifs(data.gifs || [])
    } catch {
      setGifs([])
    } finally {
      setIsLoadingGifs(false)
    }
  }

  const sendGif = async (gifUrl: string) => {
    setShowGifPicker(false)
    setGifSearchQuery('')
    setGifs([])

    // Create optimistic message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: currentUserId!,
      content: '',
      read_at: null,
      status: 'sent',
      created_at: new Date().toISOString(),
      attachment_url: gifUrl,
      attachment_type: 'gif',
      attachment_name: 'GIF',
    }
    setMessages((prev) => mergeMessages(prev, [optimisticMessage]))

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '',
          attachment_url: gifUrl,
          attachment_type: 'gif',
          attachment_name: 'GIF',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.message) {
          setMessages((prev) => {
            const withoutTemp = prev.filter((m) => m.id !== optimisticMessage.id)
            return mergeMessages(withoutTemp, [data.message])
          })
        }
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id))
        setSendError('Failed to send GIF')
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id))
      setSendError('Failed to send GIF')
    }
  }

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline
    setIsOnline(newStatus) // Optimistic update
    try {
      const res = await fetch('/api/profile/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_online: newStatus }),
      })
      if (!res.ok) setIsOnline(!newStatus) // Revert on failure
    } catch {
      setIsOnline(!newStatus) // Revert on error
    }
  }

  const handleCreateEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.event_date || !eventForm.start_time) return

    setIsCreatingEvent(true)
    try {
      const res = await fetch(`/api/conversations/${conversationId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventForm.title.trim(),
          event_date: eventForm.event_date,
          start_time: eventForm.start_time,
          end_time: eventForm.end_time || undefined,
          location: eventForm.location.trim() || undefined,
          description: eventForm.description.trim() || undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to create event')

      // Send a message about the event
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `Proposed a meetup: ${eventForm.title} on ${eventForm.event_date} at ${eventForm.start_time}${eventForm.location ? ` -- ${eventForm.location}` : ''}`,
        }),
      })

      setShowScheduleModal(false)
      setEventForm({ title: '', event_date: '', start_time: '', end_time: '', location: '', description: '' })
    } catch {
      setSendError('Failed to schedule meetup')
    } finally {
      setIsCreatingEvent(false)
    }
  }

  useEffect(() => {
    if (showGifPicker && gifs.length === 0) {
      searchGifs('')
    }
  }, [showGifPicker])

  useEffect(() => {
    if (!showGifPicker) return
    const timer = setTimeout(() => {
      searchGifs(gifSearchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [gifSearchQuery, showGifPicker])

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
                {otherUserOnline && (
                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                )}
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

          <button
            onClick={() => setShowScheduleModal(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Schedule meetup"
          >
            <CalendarIcon className="h-5 w-5 text-gray-600" />
          </button>

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

      {/* Online Status Bar */}
      <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-2">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-gray-600">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <button
            onClick={toggleOnlineStatus}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Go {isOnline ? 'offline' : 'online'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-6">
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
                          {message.attachment_url && (
                            <div className="mb-2">
                              {message.attachment_type === 'image' || message.attachment_type === 'gif' ? (
                                <img
                                  src={message.attachment_url}
                                  alt={message.attachment_name || 'Image'}
                                  className="max-w-full rounded-lg max-h-64 object-contain cursor-pointer"
                                  onClick={() => window.open(message.attachment_url!, '_blank')}
                                />
                              ) : message.attachment_type === 'video' ? (
                                <video
                                  src={message.attachment_url}
                                  controls
                                  className="max-w-full rounded-lg max-h-64"
                                />
                              ) : (
                                <a
                                  href={message.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                                    isOwn ? 'bg-blue-500/30' : 'bg-gray-200'
                                  }`}
                                >
                                  <Paperclip className="h-4 w-4 flex-shrink-0" />
                                  <span className="text-sm truncate">{message.attachment_name || 'Document'}</span>
                                </a>
                              )}
                            </div>
                          )}
                          {message.content && (
                            <p className="whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                          )}
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

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                <div key={category}>
                  <p className="text-xs font-medium text-gray-500 mb-1">{category}</p>
                  <div className="flex flex-wrap gap-1">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GIF Picker */}
      {showGifPicker && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <input
              type="text"
              value={gifSearchQuery}
              onChange={(e) => setGifSearchQuery(e.target.value)}
              placeholder="Search GIFs..."
              className="w-full px-3 py-2 mb-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {isLoadingGifs ? (
                <div className="col-span-3 flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : gifs.length === 0 ? (
                <p className="col-span-3 text-center text-sm text-gray-400 py-4">
                  {gifSearchQuery ? 'No GIFs found — try a different keyword' : 'Loading GIFs...'}
                </p>
              ) : (
                gifs.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    onClick={() => sendGif(gif.url)}
                    className="aspect-square overflow-hidden rounded-lg hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={gif.preview || gif.url}
                      alt="GIF"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] px-4 pt-3 pb-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)' }}>
        <div className="max-w-3xl mx-auto flex items-end gap-2 sm:gap-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/mp4,video/webm,application/pdf"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100 flex-shrink-0"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker)
              setShowGifPicker(false)
            }}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100 flex-shrink-0"
            type="button"
          >
            <Smile className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              setShowGifPicker(!showGifPicker)
              setShowEmojiPicker(false)
            }}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100 flex-shrink-0"
            type="button"
          >
            <span className="text-xs font-bold">GIF</span>
          </button>
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

      {/* Schedule Meetup Modal */}
      {showScheduleModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowScheduleModal(false)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-white rounded-xl shadow-xl z-50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Schedule a Meetup
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="What's the meetup for?"
                value={eventForm.title}
                onChange={(e) =>
                  setEventForm({ ...eventForm, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                maxLength={200}
              />
              <input
                type="date"
                value={eventForm.event_date}
                onChange={(e) =>
                  setEventForm({ ...eventForm, event_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="time"
                  value={eventForm.start_time}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, start_time: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Start"
                />
                <input
                  type="time"
                  value={eventForm.end_time}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, end_time: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="End (optional)"
                />
              </div>
              <input
                type="text"
                placeholder="Location (optional)"
                value={eventForm.location}
                onChange={(e) =>
                  setEventForm({ ...eventForm, location: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <textarea
                placeholder="Description (optional)"
                value={eventForm.description}
                onChange={(e) =>
                  setEventForm({ ...eventForm, description: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowScheduleModal(false)}
                className="flex-1"
                disabled={isCreatingEvent}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateEvent}
                className="flex-1"
                disabled={
                  !eventForm.title.trim() ||
                  !eventForm.event_date ||
                  !eventForm.start_time ||
                  isCreatingEvent
                }
              >
                {isCreatingEvent ? 'Scheduling...' : 'Propose Meetup'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
