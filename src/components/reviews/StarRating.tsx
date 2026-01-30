'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onChange?: (rating: number) => void
  className?: string
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onChange,
  className,
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  const handleClick = (index: number) => {
    if (interactive && onChange) {
      onChange(index + 1)
    }
  }

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: maxRating }).map((_, index) => {
        const isFilled = index < Math.floor(rating)
        const isPartial = index === Math.floor(rating) && rating % 1 > 0
        const fillPercentage = isPartial ? (rating % 1) * 100 : isFilled ? 100 : 0

        return (
          <button
            key={index}
            type="button"
            disabled={!interactive}
            onClick={() => handleClick(index)}
            className={cn(
              'relative focus:outline-none',
              interactive && 'cursor-pointer hover:scale-110 transition-transform'
            )}
          >
            {/* Background star (empty) */}
            <Star
              className={cn(
                sizeClasses[size],
                'text-gray-300'
              )}
            />
            {/* Foreground star (filled) */}
            {fillPercentage > 0 && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPercentage}%` }}
              >
                <Star
                  className={cn(
                    sizeClasses[size],
                    'text-yellow-400 fill-yellow-400'
                  )}
                />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface StarRatingDisplayProps {
  rating: number | null
  reviewCount?: number
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
  className?: string
}

export function StarRatingDisplay({
  rating,
  reviewCount,
  size = 'md',
  showCount = true,
  className,
}: StarRatingDisplayProps) {
  if (rating === null) {
    return (
      <div className={cn('flex items-center gap-1 text-gray-500', className)}>
        <StarRating rating={0} size={size} />
        <span className="text-sm">No reviews yet</span>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <StarRating rating={rating} size={size} />
      <span className="text-sm font-medium text-gray-700">
        {rating.toFixed(1)}
      </span>
      {showCount && reviewCount !== undefined && (
        <span className="text-sm text-gray-500">
          ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  )
}
