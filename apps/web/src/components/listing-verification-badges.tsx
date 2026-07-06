'use client'

import { Shield, Camera, Mail, Phone, Award, ShieldCheck } from 'lucide-react'

interface ListingVerificationBadgesProps {
  level?: 'unverified' | 'verified' | 'trusted'
  verifications?: Array<{ type: string; status: string }>
  variant?: 'full' | 'compact'
}

const BADGE_CONFIG = [
  { key: 'id_owner', label: 'ID Verified', icon: Shield, color: 'text-secondary bg-secondary/10' },
  { key: 'live_photo', label: 'Live Photo', icon: Camera, color: 'text-secondary bg-secondary/10' },
  { key: 'mail', label: 'Address Verified', icon: Mail, color: 'text-secondary bg-secondary/10' },
  { key: 'phone', label: 'Phone', icon: Phone, color: 'text-on-surface-variant bg-surface-container' },
] as const

export function ListingVerificationBadges({
  level = 'unverified',
  verifications = [],
  variant = 'full',
}: ListingVerificationBadgesProps) {
  const completed = new Set(
    verifications.filter((v) => v.status === 'completed').map((v) => v.type)
  )
  const badges = BADGE_CONFIG.filter((b) => completed.has(b.key))
  const isTrusted = level === 'trusted'

  if (variant === 'compact') {
    if (level === 'unverified') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-container text-on-surface-variant">
          Unverified
        </span>
      )
    }
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
          isTrusted ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
        }`}
      >
        {isTrusted ? <Award className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
        {isTrusted ? 'Trusted' : 'Verified'}
      </span>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {isTrusted && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
          <Award className="h-3.5 w-3.5" />
          Trusted Listing
        </span>
      )}
      {badges.map((b) => {
        const Icon = b.icon
        return (
          <span
            key={b.key}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${b.color}`}
          >
            <Icon className="h-3 w-3" />
            {b.label}
          </span>
        )
      })}
      {level === 'unverified' && badges.length === 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-container text-on-surface-variant">
          Unverified
        </span>
      )}
    </div>
  )
}
