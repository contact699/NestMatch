import { cn } from '@/lib/utils'
import { type HTMLAttributes } from 'react'
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-surface-container text-on-surface',
    success: 'bg-secondary-container text-secondary',
    warning: 'bg-tertiary-fixed text-tertiary-container',
    danger: 'bg-error-container text-error',
    info: 'bg-primary-fixed text-primary',
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
      label: 'Unverified',
      tooltip: 'Unverified profile — email only',
      className: 'bg-surface-container text-on-surface-variant border-outline-variant/15',
      prominentClassName: 'bg-surface-container-low text-on-surface border-outline-variant/30 shadow-sm',
    },
    verified: {
      icon: ShieldCheck,
      label: 'ID Verified',
      tooltip: 'Identity verified with government ID',
      className: 'bg-primary-fixed text-primary border-primary-fixed-dim/30',
      prominentClassName: 'bg-primary-fixed text-primary border-primary-fixed-dim/50 shadow-sm',
    },
    trusted: {
      icon: ShieldAlert,
      label: 'Trusted',
      tooltip: 'Fully verified with background check',
      className: 'bg-secondary-container text-secondary border-secondary-container/30',
      prominentClassName: 'bg-secondary-container text-secondary border-secondary-container/50 shadow-sm',
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
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-on-surface text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-on-surface" />
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
    if (score >= 80) return 'bg-secondary-container text-secondary border-secondary-container/30'
    if (score >= 60) return 'bg-tertiary-fixed text-tertiary-container border-tertiary-fixed/30'
    if (score >= 40) return 'bg-primary-fixed text-primary border-primary-fixed-dim/30'
    return 'bg-error-container text-error border-error-container/30'
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
