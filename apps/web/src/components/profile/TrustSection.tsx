'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { VerificationBadge } from '@/components/ui/badge'
import { Shield, ShieldCheck, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type VerificationLevel = 'basic' | 'verified' | 'trusted'

interface TrustSectionProps {
  level: VerificationLevel
  isOwner?: boolean
  className?: string
}

export function TrustSection({ level, isOwner = false, className }: TrustSectionProps) {
  const levels = [
    {
      id: 'basic' as const,
      label: 'Unverified',
      description: 'Email only',
      icon: Shield,
      color: 'gray',
    },
    {
      id: 'verified' as const,
      label: 'Verified',
      description: 'ID verified',
      icon: ShieldCheck,
      color: 'blue',
    },
    {
      id: 'trusted' as const,
      label: 'Trusted',
      description: 'Background check',
      icon: ShieldAlert,
      color: 'green',
    },
  ]

  const currentIndex = levels.findIndex(l => l.id === level)

  const benefits = {
    basic: [
      'Profile visibility in search results',
      'Ability to message other users',
    ],
    verified: [
      'All Basic benefits',
      '1.3x boost in group matching',
      'Priority in roommate suggestions',
      'Verified badge on your profile',
    ],
    trusted: [
      'All Verified benefits',
      '1.5x boost in group matching',
      'Top priority in all suggestions',
      'Trusted badge on your profile',
      'Access to exclusive listings',
    ],
  }

  return (
    <div className={cn('bg-surface-container-lowest rounded-xl ghost-border overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-outline-variant/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-on-surface">Trust Level</h3>
            <VerificationBadge level={level} variant="prominent" showTooltip />
          </div>
          {isOwner && level !== 'trusted' && (
            <Link href="/verify">
              <Button variant="glow" size="sm">
                Upgrade
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="px-6 py-4 bg-surface-container-low">
        <div className="flex items-center justify-between">
          {levels.map((l, index) => {
            const isCompleted = index <= currentIndex
            const isCurrent = index === currentIndex
            const Icon = l.icon

            return (
              <div key={l.id} className="flex-1 flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                      isCompleted
                        ? l.color === 'gray'
                          ? 'bg-surface-container text-on-surface-variant'
                          : l.color === 'blue'
                          ? 'bg-primary-fixed text-primary'
                          : 'bg-secondary-container text-secondary'
                        : 'bg-surface-container-low text-outline',
                      isCurrent && 'ring-2 ring-offset-2',
                      isCurrent && l.color === 'gray' && 'ring-outline',
                      isCurrent && l.color === 'blue' && 'ring-primary/30',
                      isCurrent && l.color === 'green' && 'ring-secondary/30'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={cn(
                      'mt-2 text-sm font-medium',
                      isCompleted ? 'text-on-surface' : 'text-outline'
                    )}
                  >
                    {l.label}
                  </span>
                  <span className="text-xs text-on-surface-variant">{l.description}</span>
                </div>
                {index < levels.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-2',
                      index < currentIndex ? 'bg-primary/30' : 'bg-surface-container'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Benefits */}
      <div className="px-6 py-4">
        <h4 className="text-sm font-medium text-on-surface-variant mb-3">
          {level === 'trusted' ? 'Your Benefits' : 'Current Benefits'}
        </h4>
        <ul className="space-y-2">
          {benefits[level].map((benefit, index) => (
            <li key={index} className="flex items-center gap-2 text-sm text-on-surface-variant">
              <CheckCircle2 className="h-4 w-4 text-secondary flex-shrink-0" />
              {benefit}
            </li>
          ))}
        </ul>

        {isOwner && level !== 'trusted' && (
          <div className="mt-4 p-4 bg-primary-fixed rounded-lg">
            <h4 className="text-sm font-medium text-on-surface mb-2">
              Unlock more benefits
            </h4>
            <p className="text-sm text-on-surface-variant mb-3">
              {level === 'basic'
                ? 'Verify your identity to get priority in roommate matching.'
                : 'Complete a background check to become a Trusted member.'}
            </p>
            <Link href="/verify">
              <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary-fixed">
                {level === 'basic' ? 'Verify Identity' : 'Get Trusted'}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
