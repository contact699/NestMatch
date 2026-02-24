'use client'

import { StarRating, StarRatingDisplay } from './StarRating'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ReviewAggregate {
  total_reviews: number
  average_overall: number
  average_rent_payment: number | null
  average_cleanliness: number | null
  average_respect: number | null
  average_communication: number | null
}

interface ReviewSummaryProps {
  aggregate: ReviewAggregate | null
  compact?: boolean
  className?: string
}

export function ReviewSummary({
  aggregate,
  compact = false,
  className,
}: ReviewSummaryProps) {
  if (!aggregate || aggregate.total_reviews === 0) {
    return (
      <Card variant="bordered" className={className}>
        <CardContent className="py-6 text-center">
          <p className="text-gray-500">No reviews yet</p>
        </CardContent>
      </Card>
    )
  }

  const categories = [
    { label: 'Rent Payment', value: aggregate.average_rent_payment },
    { label: 'Cleanliness', value: aggregate.average_cleanliness },
    { label: 'Respect', value: aggregate.average_respect },
    { label: 'Communication', value: aggregate.average_communication },
  ].filter((c) => c.value !== null)

  if (compact) {
    return (
      <div className={className}>
        <StarRatingDisplay
          rating={aggregate.average_overall}
          reviewCount={aggregate.total_reviews}
          size="md"
        />
      </div>
    )
  }

  return (
    <Card variant="bordered" className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Reviews</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Rating */}
        <div className="flex items-center gap-4 mb-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900">
              {aggregate.average_overall.toFixed(1)}
            </div>
            <StarRating rating={aggregate.average_overall} size="md" />
            <p className="text-sm text-gray-500 mt-1">
              {aggregate.total_reviews} {aggregate.total_reviews === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          {/* Rating Distribution */}
          {categories.length > 0 && (
            <div className="flex-1 space-y-2">
              {categories.map((category) => (
                <div key={category.label} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-28">{category.label}</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
                      style={{ width: `${((category.value || 0) / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-8">
                    {category.value?.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Inline version for listing cards
interface InlineReviewSummaryProps {
  averageRating: number | null
  reviewCount: number
  size?: 'sm' | 'md'
}

export function InlineReviewSummary({
  averageRating,
  reviewCount,
  size = 'sm',
}: InlineReviewSummaryProps) {
  if (averageRating === null || reviewCount === 0) {
    return (
      <span className="text-sm text-gray-500">No reviews</span>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <StarRating rating={averageRating} size={size} />
      <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
      <span className="text-sm text-gray-500">({reviewCount})</span>
    </div>
  )
}
