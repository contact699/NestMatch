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
      label: 'Basic',
      description: 'Email verified',
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
    <div className={cn('bg-white rounded-xl border border-gray-200 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Trust Level</h3>
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
      <div className="px-6 py-4 bg-gray-50">
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
                          ? 'bg-gray-200 text-gray-600'
                          : l.color === 'blue'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-400',
                      isCurrent && 'ring-2 ring-offset-2',
                      isCurrent && l.color === 'gray' && 'ring-gray-300',
                      isCurrent && l.color === 'blue' && 'ring-blue-300',
                      isCurrent && l.color === 'green' && 'ring-green-300'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={cn(
                      'mt-2 text-sm font-medium',
                      isCompleted ? 'text-gray-900' : 'text-gray-400'
                    )}
                  >
                    {l.label}
                  </span>
                  <span className="text-xs text-gray-500">{l.description}</span>
                </div>
                {index < levels.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-2',
                      index < currentIndex ? 'bg-blue-300' : 'bg-gray-200'
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
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          {level === 'trusted' ? 'Your Benefits' : 'Current Benefits'}
        </h4>
        <ul className="space-y-2">
          {benefits[level].map((benefit, index) => (
            <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              {benefit}
            </li>
          ))}
        </ul>

        {isOwner && level !== 'trusted' && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Unlock more benefits
            </h4>
            <p className="text-sm text-blue-700 mb-3">
              {level === 'basic'
                ? 'Verify your identity to get priority in roommate matching.'
                : 'Complete a background check to become a Trusted member.'}
            </p>
            <Link href="/verify">
              <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                {level === 'basic' ? 'Verify Identity' : 'Get Trusted'}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
