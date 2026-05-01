'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { clientLogger } from '@/lib/client-logger'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  MessageCircle,
  Heart,
  Share2,
  Flag,
  Loader2,
} from 'lucide-react'
import { SaveToGroupButton } from '@/components/listings/save-to-group-button'

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
      await supabase
        .from('saved_listings')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
      setIsSaved(false)
    } else {
      // Save
      await supabase
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
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error('You need to be signed in to contact the host.')
        return
      }

      const { data: existingConversations, error: lookupError } = await supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [user.id, hostUserId])
        .eq('listing_id', listingId)

      if (lookupError) {
        clientLogger.error('Failed to look up existing conversation', lookupError)
        toast.error("Couldn't open the conversation. Please try again.")
        return
      }

      if (existingConversations && existingConversations.length > 0) {
        router.push(`/messages/${existingConversations[0].id}`)
        return
      }

      const { data: newConversation, error: insertError } = await supabase
        .from('conversations')
        .insert({
          participant_ids: [user.id, hostUserId],
          listing_id: listingId,
        })
        .select()
        .single()

      if (insertError || !newConversation) {
        clientLogger.error(
          `Failed to create conversation for listing ${listingId} (host ${hostUserId})`,
          insertError
        )
        toast.error(
          insertError?.message
            ? `Couldn't start a conversation: ${insertError.message}`
            : "Couldn't start a conversation. Please try again."
        )
        return
      }

      router.push(`/messages/${newConversation.id}`)
    } finally {
      setIsContacting(false)
    }
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
    if (!isLoggedIn) {
      router.push(`/login?redirect=/listings/${listingId}`)
      return
    }
    window.location.href = `mailto:support@nestmatch.app?subject=Report Listing: ${listingId}&body=I would like to report this listing for the following reason:%0A%0A`
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

  // NOTE: This action stack mirrors PR #12 (labelled buttons, no duplicate
  // "Message Host", report demoted to a small text link) so the two PRs
  // don't merge-conflict on this file regardless of merge order.
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

      <Button
        variant="outline"
        className={`w-full ${isSaved ? 'text-red-500 hover:bg-red-50' : ''}`}
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Heart className={`h-4 w-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
        )}
        {isSaved ? 'Saved' : 'Save Listing'}
      </Button>

      <Button variant="outline" className="w-full" onClick={handleShare}>
        <Share2 className="h-4 w-4 mr-2" />
        Share Listing
      </Button>

      <SaveToGroupButton listingId={listingId} isLoggedIn={isLoggedIn} />

      <button
        type="button"
        onClick={handleReport}
        className="w-full text-xs text-on-surface-variant hover:text-on-surface inline-flex items-center justify-center gap-1.5 pt-1 transition-colors"
      >
        <Flag className="h-3 w-3" />
        Report this listing
      </button>
    </div>
  )
}
