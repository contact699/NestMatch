'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SaveProfileButtonProps {
  /** auth.users.id of the profile being saved */
  savedUserId: string
  /** Initial saved state — fetched on the server so the button doesn't flash */
  isSavedInitial: boolean
  /** Whether the current viewer is signed in */
  isLoggedIn: boolean
  /** "icon" = compact heart only (for cards). "full" = labeled button (for profile page) */
  variant?: 'icon' | 'full'
  className?: string
}

/**
 * Toggle save/unsave for a roommate profile. Backed by saved_profiles
 * (migration 024).
 */
export function SaveProfileButton({
  savedUserId,
  isSavedInitial,
  isLoggedIn,
  variant = 'full',
  className,
}: SaveProfileButtonProps) {
  const router = useRouter()
  const [isSaved, setIsSaved] = useState(isSavedInitial)
  const [isSaving, setIsSaving] = useState(false)

  const handleToggle = async (e?: React.MouseEvent) => {
    // When the button is rendered inside a parent that has its own click
    // (e.g. a card link), don't bubble up to it.
    e?.preventDefault()
    e?.stopPropagation()

    if (!isLoggedIn) {
      router.push(`/login?redirect=/profile/${savedUserId}`)
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

    // Cast: saved_profiles was added in migration 024; the generated
    // Database type doesn't know about it yet. Regenerate types after
    // applying the migration to remove the cast.
    const fromSaved = (supabase.from as any)('saved_profiles')

    if (isSaved) {
      await fromSaved
        .delete()
        .eq('user_id', user.id)
        .eq('saved_user_id', savedUserId)
      setIsSaved(false)
    } else {
      await fromSaved.insert({ user_id: user.id, saved_user_id: savedUserId })
      setIsSaved(true)
    }

    setIsSaving(false)
    router.refresh()
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isSaving}
        aria-label={isSaved ? 'Unsave profile' : 'Save profile'}
        aria-pressed={isSaved}
        className={cn(
          'p-2 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm shadow-sm hover:bg-surface-container-low transition-colors',
          isSaved && 'text-red-500',
          className
        )}
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart className={cn('h-4 w-4', isSaved && 'fill-current')} />
        )}
      </button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleToggle}
      disabled={isSaving}
      className={cn('w-full', isSaved && 'text-red-500 hover:bg-red-50', className)}
    >
      {isSaving ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Heart className={cn('h-4 w-4 mr-2', isSaved && 'fill-current')} />
      )}
      {isSaved ? 'Saved' : 'Save Profile'}
    </Button>
  )
}
