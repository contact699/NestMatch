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
      relative inline-flex items-center justify-center font-medium rounded-lg
      transition-all duration-300 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
      active:scale-[0.98]
    `

    const variants = {
      primary: `
        bg-primary text-on-primary
        hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5
        focus-visible:ring-primary
      `,
      secondary: `
        bg-surface-container-high text-on-surface
        hover:bg-surface-container-highest hover:shadow-md hover:-translate-y-0.5
        focus-visible:ring-outline
      `,
      outline: `
        border border-outline-variant/30 bg-surface-container-lowest text-on-surface
        hover:bg-surface-container-low hover:shadow-md hover:-translate-y-0.5
        focus-visible:ring-primary
      `,
      ghost: `
        text-on-surface-variant
        hover:bg-surface-container-low
        focus-visible:ring-outline
      `,
      danger: `
        bg-error text-on-error
        hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5
        focus-visible:ring-error
      `,
      glow: `
        bg-gradient-to-r from-primary to-primary-container text-on-primary
        hover:shadow-lg hover:opacity-95
        focus-visible:ring-primary
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
