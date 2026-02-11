'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { clientLogger } from '@/lib/client-logger'

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
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <div
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium
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
}: {
  score: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  if (score === 0) return null

  const getColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <div
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium
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
