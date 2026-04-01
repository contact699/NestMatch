import { cn } from '@/lib/utils'
import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'feature' | 'glass'
  animate?: boolean
}

export function Card({ className, variant = 'default', animate = false, ...props }: CardProps) {
  const variants = {
    default: 'bg-surface-container-lowest rounded-xl',
    bordered: 'bg-surface-container-lowest rounded-xl ghost-border',
    elevated: 'bg-surface-container-lowest rounded-xl shadow-lg',
    feature: 'feature-card',
    glass: 'glass-nav rounded-xl',
  }

  return (
    <div
      className={cn(
        variants[variant],
        animate && 'card-hover',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-4 pb-4', className)}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-semibold text-on-surface', className)}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-on-surface-variant mt-1', className)}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-4', className)}
      {...props}
    />
  )
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-4 pt-4', className)}
      {...props}
    />
  )
}
