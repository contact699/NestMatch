'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  MessageCircle,
  Heart,
  Share2,
  Flag,
  Loader2,
} from 'lucide-react'

interface ListingActionsProps {
  listingId: string
  hostUserId: string
  isOwner: boolean
  isSaved: boolean
  isLoggedIn: boolean
}

export function ListingActions({
  listingId,
  hostUserId,
  isOwner,
  isSaved: initialSaved,
  isLoggedIn,
}: ListingActionsProps) {
  const router = useRouter()
  const [isSaved, setIsSaved] = useState(initialSaved)
  const [isSaving, setIsSaving] = useState(false)
  const [isContacting, setIsContacting] = useState(false)

  const handleSave = async () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/listings/${listingId}`)
      return
    }

    setIsSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setIsSaving(false)
      return
    }

    if (isSaved) {
      // Unsave
      await (supabase as any)
        .from('saved_listings')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
      setIsSaved(false)
    } else {
      // Save
      await (supabase as any)
        .from('saved_listings')
        .insert({ user_id: user.id, listing_id: listingId })
      setIsSaved(true)
    }

    setIsSaving(false)
  }

  const handleContact = async () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/listings/${listingId}`)
      return
    }

    setIsContacting(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setIsContacting(false)
      return
    }

    // Check if conversation already exists
    const { data: existingConversations } = await (supabase as any)
      .from('conversations')
      .select('id')
      .contains('participant_ids', [user.id, hostUserId])
      .eq('listing_id', listingId)

    if (existingConversations && existingConversations.length > 0) {
      // Navigate to existing conversation
      router.push(`/messages/${existingConversations[0].id}`)
    } else {
      // Create new conversation
      const { data: newConversation, error } = await (supabase as any)
        .from('conversations')
        .insert({
          participant_ids: [user.id, hostUserId],
          listing_id: listingId,
        })
        .select()
        .single()

      if (newConversation) {
        router.push(`/messages/${newConversation.id}`)
      }
    }

    setIsContacting(false)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this listing on NestMatch',
          url: window.location.href,
        })
      } catch {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const handleReport = () => {
    // For now, just redirect to a report page or show a modal
    // This will be implemented in the save & block milestone
    if (!isLoggedIn) {
      router.push(`/login?redirect=/listings/${listingId}`)
      return
    }
    alert('Report functionality coming soon')
  }

  if (isOwner) {
    return (
      <div className="space-y-2">
        <Button variant="outline" className="w-full" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Share Listing
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        onClick={handleContact}
        disabled={isContacting}
      >
        {isContacting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <MessageCircle className="h-4 w-4 mr-2" />
        )}
        Contact Host
      </Button>

      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={isSaving}
          className={isSaved ? 'text-red-600 border-red-200 hover:bg-red-50' : ''}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
          )}
        </Button>
        <Button variant="outline" onClick={handleShare}>
          <Share2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={handleReport}>
          <Flag className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
