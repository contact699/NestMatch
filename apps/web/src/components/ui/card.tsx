import { cn } from '@/lib/utils'
import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'feature' | 'glass'
  animate?: boolean
}

export function Card({ className, variant = 'default', animate = false, ...props }: CardProps) {
  const variants = {
    default: 'bg-white rounded-xl',
    bordered: 'bg-white rounded-xl border border-gray-200',
    elevated: 'bg-white rounded-xl shadow-lg',
    feature: 'feature-card',
    glass: 'glass rounded-xl',
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
      className={cn('px-6 py-4 border-b border-gray-100', className)}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-semibold text-gray-900', className)}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-gray-500 mt-1', className)}
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
      className={cn('px-6 py-4 border-t border-gray-100', className)}
      {...props}
    />
  )
}
