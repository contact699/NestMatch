'use client'

import {
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  Scale,
  TrendingUp,
  Award,
} from 'lucide-react'

interface VerificationBadgesProps {
  emailVerified?: boolean
  phoneVerified?: boolean
  verifications?: Array<{ type: string; status: string }>
  verificationLevel?: 'basic' | 'verified' | 'trusted'
  variant?: 'full' | 'compact'
  showPublic?: boolean
}

const BADGE_CONFIG = [
  { key: 'email', label: 'Email', icon: Mail, color: 'text-on-surface-variant bg-surface-container' },
  { key: 'phone', label: 'Phone', icon: Phone, color: 'text-on-surface-variant bg-surface-container' },
  { key: 'id', label: 'ID Verified', icon: Shield, color: 'text-secondary bg-secondary/10' },
  { key: 'criminal', label: 'Background', icon: Scale, color: 'text-secondary bg-secondary/10' },
  { key: 'credit', label: 'Credit', icon: TrendingUp, color: 'text-secondary bg-secondary/10' },
] as const

export function VerificationBadges({
  emailVerified = false,
  phoneVerified = false,
  verifications = [],
  verificationLevel = 'basic',
  variant = 'full',
  showPublic = true,
}: VerificationBadgesProps) {
  if (!showPublic) return null

  const completedTypes = new Set(
    verifications.filter((v) => v.status === 'completed').map((v) => v.type)
  )

  const badges = [
    { ...BADGE_CONFIG[0], verified: emailVerified },
    { ...BADGE_CONFIG[1], verified: phoneVerified },
    { ...BADGE_CONFIG[2], verified: completedTypes.has('id') },
    { ...BADGE_CONFIG[3], verified: completedTypes.has('criminal') },
    { ...BADGE_CONFIG[4], verified: completedTypes.has('credit') },
  ]

  const verifiedCount = badges.filter((b) => b.verified).length
  const isTrusted = verificationLevel === 'trusted'

  if (variant === 'compact') {
    if (isTrusted) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
          <Award className="h-3 w-3" />
          Trusted
        </span>
      )
    }

    if (verifiedCount === 0) return null

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-container text-on-surface-variant">
        <ShieldCheck className="h-3 w-3" />
        {verifiedCount}/5
      </span>
    )
  }

  // Full variant
  return (
    <div className="flex flex-wrap gap-1.5">
      {isTrusted && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
          <Award className="h-3.5 w-3.5" />
          Trusted
        </span>
      )}
      {badges.filter((b) => b.verified).map((badge) => {
        const Icon = badge.icon
        return (
          <span
            key={badge.key}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}
          >
            <Icon className="h-3 w-3" />
            {badge.label}
          </span>
        )
      })}
    </div>
  )
}
