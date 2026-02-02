'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glow'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = `
      relative inline-flex items-center justify-center font-medium rounded-xl
      transition-all duration-300 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
      active:scale-[0.98]
    `

    const variants = {
      primary: `
        bg-blue-600 text-white
        hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5
        focus-visible:ring-blue-500
      `,
      secondary: `
        bg-gray-100 text-gray-900
        hover:bg-gray-200 hover:shadow-md hover:-translate-y-0.5
        focus-visible:ring-gray-500
      `,
      outline: `
        border-2 border-gray-200 bg-white text-gray-700
        hover:border-gray-300 hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5
        focus-visible:ring-blue-500
      `,
      ghost: `
        text-gray-700
        hover:bg-gray-100
        focus-visible:ring-gray-500
      `,
      danger: `
        bg-red-600 text-white
        hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/25 hover:-translate-y-0.5
        focus-visible:ring-red-500
      `,
      glow: `
        bg-gradient-to-r from-blue-600 to-purple-600 text-white btn-glow
        hover:shadow-lg hover:shadow-blue-500/30
        focus-visible:ring-blue-500
      `,
    }

    const sizes = {
      sm: 'px-3.5 py-2 text-sm gap-1.5',
      md: 'px-5 py-2.5 text-sm gap-2',
      lg: 'px-7 py-3.5 text-base gap-2',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        aria-disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span className="sr-only">Loading</span>
          </>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
