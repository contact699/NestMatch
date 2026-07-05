'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { clientLogger } from '@/lib/client-logger'

/** Tooltip copy explaining what the compatibility score represents. */
export const COMPATIBILITY_TOOLTIP =
  'Compatibility score based on lifestyle answers (sleep, cleanliness, noise, pets) and practical factors like budget and location.'

interface CompatibilityBadgeProps {
  userId: string
  currentUserId?: string | null
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function CompatibilityBadge({
  userId,
  currentUserId,
  showLabel = true,
  size = 'md',
}: CompatibilityBadgeProps) {
  const [score, setScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUserId || currentUserId === userId) {
      setLoading(false)
      return
    }

    async function fetchScore() {
      try {
        const response = await fetch(`/api/compatibility?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          setScore(data.score)
        }
      } catch (error) {
        clientLogger.error('Error fetching compatibility', error)
      } finally {
        setLoading(false)
      }
    }

    fetchScore()
  }, [userId, currentUserId])

  if (!currentUserId || currentUserId === userId || loading) {
    return null
  }

  if (score === null || score === 0) {
    return null
  }

  const getColor = (score: number) => {
    if (score >= 80) return 'text-secondary bg-secondary-container'
    if (score >= 60) return 'text-primary bg-primary-fixed'
    if (score >= 40) return 'text-tertiary-container bg-tertiary-fixed'
    return 'text-on-surface-variant bg-surface-container'
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <div
      title={COMPATIBILITY_TOOLTIP}
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${getColor(score)}
        ${sizeClasses[size]}
      `}
    >
      <Heart className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      <span>{score}%</span>
      {showLabel && <span className="hidden sm:inline">match</span>}
    </div>
  )
}

// Static version for server-side rendering with pre-fetched score
export function CompatibilityBadgeStatic({
  score,
  showLabel = true,
  size = 'md',
  title = COMPATIBILITY_TOOLTIP,
}: {
  score: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  title?: string
}) {
  if (score === 0) return null

  const getColor = (score: number) => {
    if (score >= 80) return 'text-secondary bg-secondary-container'
    if (score >= 60) return 'text-primary bg-primary-fixed'
    if (score >= 40) return 'text-tertiary-container bg-tertiary-fixed'
    return 'text-on-surface-variant bg-surface-container'
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <div
      title={title}
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${getColor(score)}
        ${sizeClasses[size]}
      `}
    >
      <Heart className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      <span>{score}%</span>
      {showLabel && <span className="hidden sm:inline">match</span>}
    </div>
  )
}
