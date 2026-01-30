'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg'
  /** Additional class name */
  className?: string
  /** Optional text to show below spinner */
  text?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
}

/**
 * Standardized loading spinner component.
 *
 * @example
 * // Inline spinner
 * <LoadingSpinner size="sm" />
 *
 * @example
 * // Full page loading
 * <LoadingSpinner size="lg" text="Loading..." />
 */
export function LoadingSpinner({
  size = 'md',
  className,
  text,
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <Loader2
        className={cn('animate-spin text-blue-600', sizeClasses[size])}
      />
      {text && <p className="mt-4 text-gray-500 text-sm">{text}</p>}
    </div>
  )
}

interface PageLoadingProps {
  /** Optional text to show */
  text?: string
  /** Minimum height */
  minHeight?: string
}

/**
 * Full page loading state for route transitions.
 *
 * @example
 * if (isLoading) {
 *   return <PageLoading />
 * }
 */
export function PageLoading({ text = 'Loading...', minHeight = '400px' }: PageLoadingProps) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight }}
    >
      <LoadingSpinner size="lg" text={text} />
    </div>
  )
}
