'use client'

import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

type VerificationLevel = 'basic' | 'verified' | 'trusted'

interface GroupTrustIndicatorProps {
  members: Array<{
    verificationLevel: VerificationLevel
  }>
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function GroupTrustIndicator({
  members,
  size = 'md',
  showLabel = true,
}: GroupTrustIndicatorProps) {
  // Calculate aggregate trust level
  const levels = members.map(m => m.verificationLevel)
  const trusted = levels.filter(l => l === 'trusted').length
  const verified = levels.filter(l => l === 'verified').length
  const total = levels.length

  let aggregateLevel: VerificationLevel
  let label: string
  let description: string

  if (trusted >= total / 2) {
    aggregateLevel = 'trusted'
    label = 'Highly Trusted'
    description = 'Most members have completed background checks'
  } else if (verified + trusted >= total / 2) {
    aggregateLevel = 'verified'
    label = 'Verified Group'
    description = 'Most members have verified their identity'
  } else {
    aggregateLevel = 'basic'
    label = 'Basic'
    description = 'Members have basic profiles'
  }

  const config = {
    basic: {
      icon: Shield,
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-600',
      borderColor: 'border-gray-200',
      iconColor: 'text-gray-400',
    },
    verified: {
      icon: ShieldCheck,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-500',
    },
    trusted: {
      icon: ShieldAlert,
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
      iconColor: 'text-green-500',
    },
  }

  const sizes = {
    sm: {
      container: 'px-2 py-1',
      icon: 'h-3 w-3',
      text: 'text-xs',
    },
    md: {
      container: 'px-3 py-1.5',
      icon: 'h-4 w-4',
      text: 'text-sm',
    },
    lg: {
      container: 'px-4 py-2',
      icon: 'h-5 w-5',
      text: 'text-base',
    },
  }

  const { icon: Icon, bgColor, textColor, borderColor, iconColor } = config[aggregateLevel]
  const sizeConfig = sizes[size]

  return (
    <div className="group relative">
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border transition-all duration-200',
          bgColor,
          textColor,
          borderColor,
          sizeConfig.container
        )}
      >
        <Icon className={cn(sizeConfig.icon, iconColor)} />
        {showLabel && (
          <span className={cn('font-medium', sizeConfig.text)}>{label}</span>
        )}
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10">
        {description}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  )
}
