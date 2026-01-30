'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StarRating } from './StarRating'
import { Loader2 } from 'lucide-react'

interface ReviewFormProps {
  cohabitationId: string
  revieweeId: string
  revieweeName: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface RatingCategory {
  key: 'rent_payment_rating' | 'cleanliness_rating' | 'respect_rating' | 'communication_rating'
  label: string
  description: string
}

const RATING_CATEGORIES: RatingCategory[] = [
  {
    key: 'rent_payment_rating',
    label: 'Rent Payment',
    description: 'Pays rent on time and as agreed',
  },
  {
    key: 'cleanliness_rating',
    label: 'Cleanliness',
    description: 'Keeps shared spaces clean and tidy',
  },
  {
    key: 'respect_rating',
    label: 'Respect',
    description: 'Respects boundaries, noise levels, and shared rules',
  },
  {
    key: 'communication_rating',
    label: 'Communication',
    description: 'Communicates clearly and responds promptly',
  },
]

export function ReviewForm({
  cohabitationId,
  revieweeId,
  revieweeName,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRatingChange = (key: string, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate at least one rating
    const hasRating = Object.values(ratings).some((r) => r > 0)
    if (!hasRating) {
      setError('Please provide at least one rating')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohabitation_id: cohabitationId,
          reviewee_id: revieweeId,
          rent_payment_rating: ratings.rent_payment_rating || null,
          cleanliness_rating: ratings.cleanliness_rating || null,
          respect_rating: ratings.respect_rating || null,
          communication_rating: ratings.communication_rating || null,
          comment: comment.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review')
      }

      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const averageRating = Object.values(ratings).length > 0
    ? Object.values(ratings).reduce((sum, r) => sum + r, 0) / Object.values(ratings).length
    : 0

  return (
    <Card variant="bordered">
      <CardHeader>
        <CardTitle>Review {revieweeName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating Categories */}
          <div className="space-y-4">
            {RATING_CATEGORIES.map((category) => (
              <div key={category.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">
                      {category.label}
                    </label>
                    <p className="text-xs text-gray-500">{category.description}</p>
                  </div>
                  <StarRating
                    rating={ratings[category.key] || 0}
                    interactive
                    onChange={(value) => handleRatingChange(category.key, value)}
                    size="md"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Average Preview */}
          {averageRating > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Overall Rating</span>
                <div className="flex items-center gap-2">
                  <StarRating rating={averageRating} size="sm" />
                  <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Share your experience living with this person..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {comment.length}/2000 characters
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </Button>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-gray-500 text-center">
            Your review will be visible to other NestMatch users. Reviews can be edited within 7 days of submission.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
