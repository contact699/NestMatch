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
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'prominent'
  showTooltip?: boolean
}

export function VerificationBadge({
  level,
  showLabel = true,
  size = 'md',
  variant = 'default',
  showTooltip = false,
}: VerificationBadgeProps) {
  const config = {
    basic: {
      icon: Shield,
      label: 'Basic',
      tooltip: 'Basic profile - email verified',
      className: 'bg-gray-100 text-gray-600 border-gray-200',
      prominentClassName: 'bg-gray-50 text-gray-700 border-gray-300 shadow-sm',
    },
    verified: {
      icon: ShieldCheck,
      label: 'ID Verified',
      tooltip: 'Identity verified with government ID',
      className: 'bg-blue-100 text-blue-700 border-blue-200',
      prominentClassName: 'bg-blue-50 text-blue-800 border-blue-300 shadow-sm shadow-blue-100',
    },
    trusted: {
      icon: ShieldAlert,
      label: 'Trusted',
      tooltip: 'Fully verified with background check',
      className: 'bg-green-100 text-green-700 border-green-200',
      prominentClassName: 'bg-green-50 text-green-800 border-green-300 shadow-sm shadow-green-100',
    },
  }

  const { icon: Icon, label, tooltip, className, prominentClassName } = config[level]

  const sizes = {
    sm: { icon: 'h-3 w-3', text: 'text-xs', padding: 'px-2 py-0.5' },
    md: { icon: 'h-4 w-4', text: 'text-xs', padding: 'px-2 py-0.5' },
    lg: { icon: 'h-5 w-5', text: 'text-sm', padding: 'px-3 py-1' },
  }

  const sizeConfig = sizes[size]
  const badgeClassName = variant === 'prominent' ? prominentClassName : className

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium border transition-all duration-200',
        sizeConfig.padding,
        sizeConfig.text,
        badgeClassName,
        variant === 'prominent' && 'hover:scale-105'
      )}
    >
      <Icon className={sizeConfig.icon} />
      {showLabel && label}
    </span>
  )

  if (showTooltip) {
    return (
      <div className="group relative inline-flex">
        {badge}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </div>
      </div>
    )
  }

  return badge
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
