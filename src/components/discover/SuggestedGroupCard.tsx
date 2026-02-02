'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VerificationBadge, CompatibilityBadge } from '@/components/ui/badge'
import { GroupTrustIndicator } from './GroupTrustIndicator'
import { MatchCriteriaCard } from './MatchCriteriaCard'
import {
  Users,
  ChevronDown,
  ChevronUp,
  UserPlus,
  X,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type VerificationLevel = 'basic' | 'verified' | 'trusted'

interface MemberProfile {
  userId: string
  name: string | null
  profilePhoto: string | null
  verificationLevel: VerificationLevel
  city: string | null
  province: string | null
}

interface MatchCriteria {
  budgetOverlap: {
    min: number
    max: number
  }
  commonCities: string[]
  dateRange: {
    earliest: string
    latest: string
  }
}

interface SuggestedGroupCardProps {
  suggestionId: string
  members: MemberProfile[]
  practicalScore: number
  compatibilityScore: number
  trustScore: number
  combinedScore: number
  matchCriteria: MatchCriteria
  currentUserId: string
  onInterest: () => void
  onDismiss: () => void
  isLoading?: boolean
}

export function SuggestedGroupCard({
  suggestionId,
  members,
  practicalScore,
  compatibilityScore,
  trustScore,
  combinedScore,
  matchCriteria,
  currentUserId,
  onInterest,
  onDismiss,
  isLoading = false,
}: SuggestedGroupCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Separate current user from other members
  const otherMembers = members.filter(m => m.userId !== currentUserId)

  return (
    <Card variant="bordered" animate className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header with AI badge */}
        <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-purple-700">
                AI Suggested Group
              </span>
            </div>
            <GroupTrustIndicator members={members} size="sm" />
          </div>
        </div>

        {/* Main content */}
        <div className="p-4">
          {/* Member avatars row */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex -space-x-3">
              {otherMembers.slice(0, 3).map((member, index) => (
                <div
                  key={member.userId}
                  className="relative w-12 h-12 rounded-full border-2 border-white shadow-sm overflow-hidden transition-transform hover:scale-105 hover:z-10"
                  style={{ zIndex: 3 - index }}
                >
                  {member.profilePhoto ? (
                    <img
                      src={member.profilePhoto}
                      alt={member.name || 'Member'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                  )}
                </div>
              ))}
              {otherMembers.length > 3 && (
                <div className="w-12 h-12 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                  +{otherMembers.length - 3}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {otherMembers.length === 1
                  ? otherMembers[0].name || 'Potential Roommate'
                  : `${otherMembers.length} Potential Roommates`}
              </h3>
              <p className="text-sm text-gray-500 truncate">
                {matchCriteria.commonCities.slice(0, 2).join(', ')}
              </p>
            </div>

            <CompatibilityBadge score={combinedScore} size="md" />
          </div>

          {/* Member names and badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {otherMembers.map(member => (
              <Link
                key={member.userId}
                href={`/profile/${member.userId}`}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm text-gray-700">{member.name || 'Anonymous'}</span>
                <VerificationBadge
                  level={member.verificationLevel}
                  showLabel={false}
                  size="sm"
                />
              </Link>
            ))}
          </div>

          {/* Match criteria summary */}
          <MatchCriteriaCard criteria={matchCriteria} compact />

          {/* Expandable details */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-4 text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show match details
              </>
            )}
          </button>

          <div
            className={cn(
              'overflow-hidden transition-all duration-300',
              expanded ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
            )}
          >
            {/* Detailed scores */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{practicalScore}%</p>
                <p className="text-xs text-gray-500">Practical Match</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{compatibilityScore}%</p>
                <p className="text-xs text-gray-500">Lifestyle Match</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{trustScore}%</p>
                <p className="text-xs text-gray-500">Trust Score</p>
              </div>
            </div>

            {/* Full match criteria */}
            <MatchCriteriaCard criteria={matchCriteria} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 pt-0">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onDismiss}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-1" />
            Not Interested
          </Button>
          <Button
            variant="glow"
            className="flex-1"
            onClick={onInterest}
            disabled={isLoading}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Form Group
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
