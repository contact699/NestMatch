'use client'

import { Clock, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface LastUpdatedProps {
  date: string | Date
  reviewedAt?: string | Date | null
}

export function LastUpdated({ date, reviewedAt }: LastUpdatedProps) {
  const updatedDate = new Date(date)
  const reviewed = reviewedAt ? new Date(reviewedAt) : null

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
      <span className="flex items-center gap-1.5">
        <Clock className="h-4 w-4" />
        Updated {formatDistanceToNow(updatedDate, { addSuffix: true })}
      </span>
      {reviewed && (
        <span className="flex items-center gap-1.5 text-secondary">
          <CheckCircle className="h-4 w-4" />
          Reviewed {formatDistanceToNow(reviewed, { addSuffix: true })}
        </span>
      )}
    </div>
  )
}
