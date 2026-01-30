'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate, getRelativeTime } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { VerificationBadge, Badge } from '@/components/ui/badge'
import {
  MessageCircle,
  Search,
  Users,
  Home,
  Loader2,
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
  const [searchQuery, setSearchQuery] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

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

  useEffect(() => {
    async function loadConversations() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/messages')
        return
      }

      setCurrentUserId(user.id)

      const response = await fetch('/api/conversations')
      const data = await response.json()

      if (response.ok) {
        setConversations(data.conversations)
      }

      setIsLoading(false)

      // Set up real-time subscription for new messages
      const channel = supabase
        .channel('messages-inbox')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async () => {
            // Refresh conversations on new message
            const refreshResponse = await fetch('/api/conversations')
            const refreshData = await refreshResponse.json()
            if (refreshResponse.ok) {
              setConversations(refreshData.conversations)
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    loadConversations()
  }, [router])

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true
    const name = conv.other_profile?.name?.toLowerCase() || ''
    const listing = conv.listings?.title.toLowerCase() || ''
    return name.includes(searchQuery.toLowerCase()) || listing.includes(searchQuery.toLowerCase())
  })

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600">
              {totalUnread > 0
                ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}`
                : 'Your conversations'}
            </p>
          </div>
        </div>

        {/* Search */}
        {conversations.length > 0 && (
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* Conversations list */}
      {conversations.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="py-12 text-center">
            <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No messages yet
            </h3>
            <p className="text-gray-500 mb-4">
              Start a conversation by contacting someone from a listing.
            </p>
            <Link
              href="/search"
              className="text-blue-600 hover:underline"
            >
              Browse listings
            </Link>
          </CardContent>
        </Card>
      ) : filteredConversations.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">No conversations match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/messages/${conversation.id}`}
            >
              <Card
                variant="bordered"
                className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                  conversation.unread_count > 0 ? 'border-blue-200 bg-blue-50/30' : ''
                }`}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                        {conversation.other_profile?.profile_photo ? (
                          <img
                            src={conversation.other_profile.profile_photo}
                            alt={conversation.other_profile.name || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="h-6 w-6 text-blue-600" />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className={`font-medium truncate ${
                            conversation.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {conversation.other_profile?.name || 'Anonymous'}
                          </h3>
                          <VerificationBadge
                            level={conversation.other_profile?.verification_level || 'basic'}
                            size="sm"
                            showLabel={false}
                          />
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {conversation.last_message?.created_at
                            ? getRelativeTime(conversation.last_message.created_at)
                            : getRelativeTime(conversation.created_at)}
                        </span>
                      </div>

                      {/* Last message */}
                      {conversation.last_message && (
                        <p className={`text-sm truncate mt-1 ${
                          conversation.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                        }`}>
                          {conversation.last_message.sender_id === currentUserId && (
                            <span className="text-gray-400">You: </span>
                          )}
                          {conversation.last_message.content}
                        </p>
                      )}

                      {/* Listing context */}
                      {conversation.listings && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                          <Home className="h-3 w-3" />
                          <span className="truncate">{conversation.listings.title}</span>
                        </div>
                      )}
                    </div>

                    {/* Unread indicator */}
                    {conversation.unread_count > 0 && (
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-medium rounded-full">
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
