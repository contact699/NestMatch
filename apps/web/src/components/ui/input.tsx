'use client'

import { forwardRef, type InputHTMLAttributes, useId } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, type = 'text', id, required, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`

    // Build aria-describedby based on which descriptions exist
    const describedByIds: string[] = []
    if (error) describedByIds.push(errorId)
    else if (helperText) describedByIds.push(helperId)
    const ariaDescribedBy = describedByIds.length > 0 ? describedByIds.join(' ') : undefined

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-on-surface-variant mb-1"
          >
            {label}
            {required && (
              <span className="text-error ml-1" aria-hidden="true">*</span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={ariaDescribedBy}
          aria-required={required}
          className={cn(
            'w-full px-3 py-2 rounded-lg text-on-surface placeholder-on-surface-variant/50',
            'bg-surface-container-low border-0',
            'focus:outline-none focus:ring-2 focus:ring-surface-tint/20 focus:bg-surface-container-lowest',
            'disabled:bg-surface-container-high disabled:cursor-not-allowed',
            error
              ? 'ring-2 ring-error/50'
              : '',
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1 text-sm text-error" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1 text-sm text-on-surface-variant">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
