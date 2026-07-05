import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  /** Message describing what failed. Falls back to a generic message. */
  message?: string
  /** Called when the retry button is pressed. Button is hidden when omitted. */
  onRetry?: () => void
  /** Optional heading override */
  title?: string
  /** Override the default padding / layout wrapper classes */
  className?: string
}

/**
 * Consistent error-state display for failed data fetches, using app design tokens.
 * Renders a retry affordance so failures never silently show an empty screen.
 *
 * @example
 * if (error) return <ErrorState message={error} onRetry={refetch} />
 */
export function ErrorState({
  message = 'We couldn’t load this right now. Please try again.',
  onRetry,
  title = 'Something went wrong',
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('text-center py-12', className)}>
      <div className="mx-auto w-12 h-12 rounded-full bg-error-container flex items-center justify-center mb-4">
        <AlertCircle className="h-6 w-6 text-error" />
      </div>
      <h3 className="text-lg font-medium text-on-surface mb-2">{title}</h3>
      <p className="text-on-surface-variant max-w-md mx-auto">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      )}
    </div>
  )
}
