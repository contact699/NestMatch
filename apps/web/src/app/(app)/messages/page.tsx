'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { clientLogger } from '@/lib/client-logger'
import { formatDate, getRelativeTime } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { VerificationBadge, Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import {
  MessageCircle,
  Search,
  Users,
  Home,
  Loader2,
  Filter,
  PenLine,
} from 'lucide-react'

interface Conversation {
  id: string
  participant_ids: string[]
  listing_id: string | null
  last_message_at: string | null
  created_at: string
  other_profile: {
    id: string
    user_id: string
    name: string | null
    profile_photo: string | null
    verification_level: 'basic' | 'verified' | 'trusted'
  } | null
  last_message: {
    id: string
    content: string
    sender_id: string
    created_at: string
    read_at: string | null
  } | null
  listings: {
    id: string
    title: string
    photos: string[]
  } | null
  unread_count: number
}

export default function MessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Set up intersection observer for animations
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      containerRef.current?.querySelectorAll('[data-animate]').forEach((el) => {
        el.classList.add('is-visible')
      })
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    containerRef.current?.querySelectorAll('[data-animate]').forEach((el) => {
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [conversations])

  // Handle "to" parameter for starting new conversations
  useEffect(() => {
    const toUserId = searchParams.get('to')
    if (!toUserId) return

    async function startConversation() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/messages?to=' + toUserId)
        return
      }

      // Create or get existing conversation
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: toUserId }),
      })

      if (response.ok) {
        const data = await response.json()
        router.replace(`/messages/${data.conversation.id}`)
      }
    }

    startConversation()
  }, [searchParams, router])

  // Tracks whether we have a successfully-loaded list; the realtime
  // subscription refetches on every new message, and a transient failure
  // there must not replace an already-rendered list with a full error state.
  const hasLoadedRef = useRef(false)

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/conversations')
      const data = await response.json()

      if (response.ok) {
        setConversations(data.conversations)
        hasLoadedRef.current = true
        setError(null)
      } else if (!hasLoadedRef.current) {
        setError(data.error || 'Failed to load conversations')
      }
    } catch (err) {
      clientLogger.error('Error loading conversations', err)
      if (!hasLoadedRef.current) {
        setError('We couldn’t load your conversations right now. Please try again.')
      }
    }
  }, [])

  const handleRetry = useCallback(async () => {
    setIsLoading(true)
    await fetchConversations()
    setIsLoading(false)
  }, [fetchConversations])

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function loadConversations() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/messages')
        return
      }

      setCurrentUserId(user.id)

      await fetchConversations()

      setIsLoading(false)

      // Set up real-time subscription for new messages
      channel = supabase
        .channel('messages-inbox')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          () => {
            // Refresh conversations on new message
            fetchConversations()
          }
        )
        .subscribe()
    }

    loadConversations()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [router, fetchConversations])

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true
    const name = conv.other_profile?.name?.toLowerCase() || ''
    const listing = conv.listings?.title.toLowerCase() || ''
    return name.includes(searchQuery.toLowerCase()) || listing.includes(searchQuery.toLowerCase())
  })

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0)

  // Stagger delay classes
  const getDelayClass = (index: number) => {
    const delays = ['delay-100', 'delay-200', 'delay-300', 'delay-400', 'delay-500', 'delay-600']
    return delays[index % delays.length]
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6" data-animate>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-on-surface">Inbox</h1>
            <p className="text-on-surface-variant mt-1">
              {totalUnread > 0
                ? <>You have <span className="font-semibold text-on-surface">{totalUnread} unread</span> message{totalUnread > 1 ? 's' : ''}</>
                : 'Your conversations'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors">
              <Filter className="h-4 w-4" />
              Filter
            </button>
            <Link
              href="/search"
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-on-secondary text-sm font-medium rounded-xl hover:bg-secondary/90 transition-colors"
            >
              <PenLine className="h-4 w-4" />
              New Message
            </Link>
          </div>
        </div>

        {/* Search */}
        {conversations.length > 0 && (
          <div className="relative mt-4 delay-100" data-animate>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-10 pr-4 py-2.5 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent bg-surface-container-lowest backdrop-blur-sm transition-all text-on-surface placeholder:text-on-surface-variant"
            />
          </div>
        )}
      </div>

      {/* Conversations list */}
      {error ? (
        <Card variant="bordered" data-animate className="delay-200">
          <ErrorState message={error} onRetry={handleRetry} />
        </Card>
      ) : conversations.length === 0 ? (
        <Card variant="bordered" data-animate className="delay-200">
          <EmptyState
            icon={MessageCircle}
            title="No messages yet"
            description="Start a conversation by contacting someone from a listing."
            action={
              <Link
                href="/search"
                className="text-secondary hover:underline font-medium"
              >
                Browse listings
              </Link>
            }
          />
        </Card>
      ) : filteredConversations.length === 0 ? (
        <Card variant="bordered" data-animate className="delay-200">
          <CardContent className="py-8 text-center">
            <p className="text-on-surface-variant">No conversations match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((conversation, index) => (
            <Link
              key={conversation.id}
              href={`/messages/${conversation.id}`}
              data-animate
              className={getDelayClass(index)}
            >
              <Card
                variant="bordered"
                animate
                className={`cursor-pointer ${
                  conversation.unread_count > 0 ? 'bg-secondary-container/10' : ''
                }`}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-105">
                        {conversation.other_profile?.profile_photo ? (
                          <img
                            src={conversation.other_profile.profile_photo}
                            alt={conversation.other_profile.name || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="h-6 w-6 text-on-surface-variant" />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className={`truncate ${
                            conversation.unread_count > 0 ? 'font-semibold text-on-surface' : 'font-medium text-on-surface'
                          }`}>
                            {conversation.other_profile?.name || 'Anonymous'}
                          </h3>
                          <VerificationBadge
                            level={conversation.other_profile?.verification_level || 'basic'}
                            size="sm"
                            showLabel={false}
                          />
                        </div>
                        <span className={`text-xs flex-shrink-0 ${
                          conversation.unread_count > 0 ? 'text-secondary font-semibold' : 'text-on-surface-variant'
                        }`}>
                          {conversation.last_message?.created_at
                            ? getRelativeTime(conversation.last_message.created_at)
                            : getRelativeTime(conversation.created_at)}
                        </span>
                      </div>

                      {/* Subject line - listing title as subject */}
                      {conversation.listings && (
                        <p className={`text-sm truncate mt-0.5 ${
                          conversation.unread_count > 0 ? 'font-semibold text-on-surface' : 'text-on-surface-variant'
                        }`}>
                          Re: {conversation.listings.title}
                        </p>
                      )}

                      {/* Last message preview */}
                      {conversation.last_message && (
                        <p className={`text-sm truncate mt-0.5 ${
                          conversation.unread_count > 0 ? 'text-on-surface' : 'text-on-surface-variant'
                        }`}>
                          {conversation.last_message.sender_id === currentUserId && (
                            <span className="text-on-surface-variant">You: </span>
                          )}
                          {conversation.last_message.content}
                        </p>
                      )}
                    </div>

                    {/* Unread indicator */}
                    {conversation.unread_count > 0 && (
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-secondary text-on-secondary text-xs font-medium rounded-full">
                          {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
