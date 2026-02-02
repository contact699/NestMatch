'use client'

import { DollarSign, MapPin, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MatchCriteria {
  budgetOverlap: {
    min: number
    max: number
  }
  commonCities: string[]
  dateRange: {
    earliest: string
    latest: string
  }
}

interface MatchCriteriaCardProps {
  criteria: MatchCriteria
  className?: string
  compact?: boolean
}

export function MatchCriteriaCard({
  criteria,
  className,
  compact = false,
}: MatchCriteriaCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (compact) {
    return (
      <div className={cn('flex flex-wrap gap-2 text-xs', className)}>
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full">
          <DollarSign className="h-3 w-3" />
          {formatCurrency(criteria.budgetOverlap.min)}-{formatCurrency(criteria.budgetOverlap.max)}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
          <MapPin className="h-3 w-3" />
          {criteria.commonCities.slice(0, 2).join(', ')}
          {criteria.commonCities.length > 2 && ` +${criteria.commonCities.length - 2}`}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-full">
          <Calendar className="h-3 w-3" />
          {formatDate(criteria.dateRange.earliest)}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('bg-gray-50 rounded-lg p-4 space-y-3', className)}>
      <h4 className="text-sm font-medium text-gray-700">Match Criteria</h4>

      <div className="grid gap-3">
        {/* Budget */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <DollarSign className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Budget Range</p>
            <p className="text-sm text-gray-600">
              {formatCurrency(criteria.budgetOverlap.min)} - {formatCurrency(criteria.budgetOverlap.max)}/month
            </p>
          </div>
        </div>

        {/* Cities */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <MapPin className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Preferred Cities</p>
            <p className="text-sm text-gray-600">
              {criteria.commonCities.join(', ')}
            </p>
          </div>
        </div>

        {/* Move Date */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Calendar className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Move-in Window</p>
            <p className="text-sm text-gray-600">
              {formatDate(criteria.dateRange.earliest)}
              {criteria.dateRange.earliest !== criteria.dateRange.latest && (
                <> - {formatDate(criteria.dateRange.latest)}</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
