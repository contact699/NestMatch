'use client'

import { StarRating } from './StarRating'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { User, Home, Calendar } from 'lucide-react'

interface Review {
  id: string
  rent_payment_rating: number | null
  cleanliness_rating: number | null
  respect_rating: number | null
  communication_rating: number | null
  overall_rating: number | null
  comment: string | null
  created_at: string
  reviewer?: {
    user_id: string
    name: string
    profile_photo: string | null
  }
  reviewee?: {
    user_id: string
    name: string
    profile_photo: string | null
  }
  cohabitation?: {
    id: string
    start_date: string
    end_date: string | null
    listing?: {
      id: string
      title: string
      city: string
    }
  }
}

interface ReviewCardProps {
  review: Review
  showReviewer?: boolean
  showReviewee?: boolean
  showListing?: boolean
  compact?: boolean
}

export function ReviewCard({
  review,
  showReviewer = true,
  showReviewee = false,
  showListing = false,
  compact = false,
}: ReviewCardProps) {
  const ratingCategories = [
    { key: 'rent_payment_rating', label: 'Rent', value: review.rent_payment_rating },
    { key: 'cleanliness_rating', label: 'Cleanliness', value: review.cleanliness_rating },
    { key: 'respect_rating', label: 'Respect', value: review.respect_rating },
    { key: 'communication_rating', label: 'Communication', value: review.communication_rating },
  ].filter((r) => r.value !== null)

  return (
    <Card variant="bordered">
      <CardContent className={compact ? 'py-3' : 'py-4'}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Reviewer Avatar */}
            {showReviewer && review.reviewer && (
              <div className="flex items-center gap-2">
                {review.reviewer.profile_photo ? (
                  <img
                    src={review.reviewer.profile_photo}
                    alt={review.reviewer.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{review.reviewer.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(review.created_at)}
                  </p>
                </div>
              </div>
            )}

            {/* Reviewee info (if showing) */}
            {showReviewee && review.reviewee && (
              <div className="flex items-center gap-2">
                {review.reviewee.profile_photo ? (
                  <img
                    src={review.reviewee.profile_photo}
                    alt={review.reviewee.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-green-600" />
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Review for</p>
                  <p className="font-medium text-gray-900">{review.reviewee.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Overall Rating */}
          <div className="text-right">
            <StarRating
              rating={review.overall_rating || 0}
              size={compact ? 'sm' : 'md'}
            />
            {review.overall_rating && (
              <p className="text-sm font-medium text-gray-700 mt-0.5">
                {review.overall_rating.toFixed(1)}
              </p>
            )}
          </div>
        </div>

        {/* Listing Info */}
        {showListing && review.cohabitation?.listing && (
          <div className="flex items-center gap-4 mb-3 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span>{review.cohabitation.listing.title}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {formatDate(review.cohabitation.start_date)}
                {review.cohabitation.end_date && ` - ${formatDate(review.cohabitation.end_date)}`}
              </span>
            </div>
          </div>
        )}

        {/* Category Ratings */}
        {!compact && ratingCategories.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {ratingCategories.map((category) => (
              <div key={category.key} className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{category.label}</p>
                <div className="flex items-center justify-center gap-1">
                  <StarRating rating={category.value || 0} size="sm" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comment */}
        {review.comment && (
          <p className={`text-gray-700 ${compact ? 'text-sm line-clamp-2' : ''}`}>
            {review.comment}
          </p>
        )}

        {/* No comment placeholder */}
        {!review.comment && !compact && (
          <p className="text-gray-400 italic text-sm">No written review provided</p>
        )}
      </CardContent>
    </Card>
  )
}
