'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'

interface HelpfulVoteProps {
  type: 'resource' | 'faq'
  itemId: string
  helpfulCount: number
  notHelpfulCount?: number
  userVote?: 'helpful' | 'not_helpful' | null
}

export function HelpfulVote({
  type,
  itemId,
  helpfulCount,
  notHelpfulCount = 0,
  userVote: initialVote,
}: HelpfulVoteProps) {
  const [vote, setVote] = useState<'helpful' | 'not_helpful' | null>(initialVote || null)
  const [isLoading, setIsLoading] = useState(false)
  const [counts, setCounts] = useState({ helpful: helpfulCount, notHelpful: notHelpfulCount })

  const handleVote = async (voteType: 'helpful' | 'not_helpful') => {
    setIsLoading(true)

    // Optimistically update
    const previousVote = vote
    const previousCounts = { ...counts }

    if (vote === voteType) {
      // Remove vote
      setVote(null)
      setCounts((prev) => ({
        ...prev,
        [voteType === 'helpful' ? 'helpful' : 'notHelpful']:
          prev[voteType === 'helpful' ? 'helpful' : 'notHelpful'] - 1,
      }))
    } else {
      // Add or change vote
      setVote(voteType)
      setCounts((prev) => ({
        helpful: voteType === 'helpful'
          ? prev.helpful + 1
          : previousVote === 'helpful'
          ? prev.helpful - 1
          : prev.helpful,
        notHelpful: voteType === 'not_helpful'
          ? prev.notHelpful + 1
          : previousVote === 'not_helpful'
          ? prev.notHelpful - 1
          : prev.notHelpful,
      }))
    }

    try {
      const response = await fetch('/api/resources/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          itemId,
          voteType: vote === voteType ? null : voteType,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to vote')
      }
    } catch (error) {
      // Revert on error
      setVote(previousVote)
      setCounts(previousCounts)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-500">Was this helpful?</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleVote('helpful')}
          disabled={isLoading}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-colors
            ${vote === 'helpful'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
            disabled:opacity-50
          `}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ThumbsUp className="h-4 w-4" />
          )}
          <span>{counts.helpful}</span>
        </button>
        <button
          onClick={() => handleVote('not_helpful')}
          disabled={isLoading}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-colors
            ${vote === 'not_helpful'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
            disabled:opacity-50
          `}
        >
          <ThumbsDown className="h-4 w-4" />
          {type === 'faq' && <span>{counts.notHelpful}</span>}
        </button>
      </div>
    </div>
  )
}
