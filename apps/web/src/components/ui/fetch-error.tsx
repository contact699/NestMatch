'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './button'

interface FetchErrorProps {
  /** Error message to display */
  message: string
  /** Called when retry button is clicked */
  onRetry?: () => void
  /** Custom class name */
  className?: string
}

/**
 * Consistent error display component for failed data fetches.
 *
 * @example
 * if (error) {
 *   return <FetchError message={error} onRetry={refetch} />
 * }
 */
export function FetchError({ message, onRetry, className = '' }: FetchErrorProps) {
  return (
    <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800">Something went wrong</p>
          <p className="text-sm text-red-600 mt-1">{message}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-3"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Inline error for forms or smaller contexts.
 */
export function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-red-600">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}
