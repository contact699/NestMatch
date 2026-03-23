'use client'

import { useState } from 'react'
import { Bookmark, Loader2 } from 'lucide-react'

interface BookmarkButtonProps {
  type: 'resource' | 'faq'
  itemId: string
  isBookmarked?: boolean
  variant?: 'icon' | 'button'
}

export function BookmarkButton({
  type,
  itemId,
  isBookmarked: initialBookmarked = false,
  variant = 'icon',
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = async () => {
    setIsLoading(true)
    const wasBookmarked = isBookmarked
    setIsBookmarked(!isBookmarked)

    try {
      if (wasBookmarked) {
        const response = await fetch(`/api/resources/bookmarks/${itemId}?type=${type}`, {
          method: 'DELETE',
        })
        if (!response.ok) throw new Error('Failed to remove bookmark')
      } else {
        const response = await fetch('/api/resources/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, itemId }),
        })
        if (!response.ok) throw new Error('Failed to add bookmark')
      }
    } catch (error) {
      setIsBookmarked(wasBookmarked)
    } finally {
      setIsLoading(false)
    }
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          p-2 rounded-full transition-colors
          ${isBookmarked
            ? 'bg-secondary-container text-secondary'
            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}
          disabled:opacity-50
        `}
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors
        ${isBookmarked
          ? 'bg-secondary-container text-secondary'
          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}
        disabled:opacity-50
      `}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
      )}
      {isBookmarked ? 'Saved' : 'Save'}
    </button>
  )
}
