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
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-secondary-container text-secondary mr-2.5">
            <Share2 className="h-4 w-4" />
          </span>
          Share Listing
        </Button>
      </div>
    )
  }

  // Each action gets a tinted icon "chip" so the meaning is readable at a
  // glance — tester reported the actions felt label-only because the inline
  // 16px icons were easy to overlook against the button background.
  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        onClick={handleContact}
        disabled={isContacting}
      >
        {isContacting ? (
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
        ) : (
          <MessageCircle className="h-5 w-5 mr-2" />
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
          <Loader2 className="h-5 w-5 mr-2.5 animate-spin" />
        ) : (
          <span
            className={`inline-flex items-center justify-center h-7 w-7 rounded-lg mr-2.5 ${
              isSaved ? 'bg-red-100 text-red-500' : 'bg-tertiary-fixed/30 text-tertiary'
            }`}
          >
            <Heart className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
          </span>
        )}
        {isSaved ? 'Saved' : 'Save Listing'}
      </Button>

      <Button variant="outline" className="w-full" onClick={handleShare}>
        <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-primary-fixed/30 text-primary mr-2.5">
          <Share2 className="h-4 w-4" />
        </span>
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
