import { cn } from '@/lib/utils'
import { type HTMLAttributes } from 'react'
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

interface VerificationBadgeProps {
  level: 'basic' | 'verified' | 'trusted'
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export function VerificationBadge({ level, showLabel = true, size = 'md' }: VerificationBadgeProps) {
  const config = {
    basic: {
      icon: Shield,
      label: 'Basic',
      className: 'bg-gray-100 text-gray-600 border-gray-200',
    },
    verified: {
      icon: ShieldCheck,
      label: 'ID Verified',
      className: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    trusted: {
      icon: ShieldAlert,
      label: 'Trusted',
      className: 'bg-green-100 text-green-700 border-green-200',
    },
  }

  const { icon: Icon, label, className } = config[level]
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
        className
      )}
    >
      <Icon className={iconSize} />
      {showLabel && label}
    </span>
  )
}

interface CompatibilityBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

export function CompatibilityBadge({ score, size = 'md' }: CompatibilityBadgeProps) {
  const getColor = () => {
    if (score >= 80) return 'bg-green-100 text-green-700 border-green-200'
    if (score >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    if (score >= 40) return 'bg-orange-100 text-orange-700 border-orange-200'
    return 'bg-red-100 text-red-700 border-red-200'
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold border',
        getColor(),
        sizes[size]
      )}
    >
      {score}% Match
    </span>
  )
}
