'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { clientLogger } from '@/lib/client-logger'
import { Card } from '@/components/ui/card'
import { VerificationBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, ArrowRight, Loader2, MapPin } from 'lucide-react'

interface Member {
  user_id: string
  name: string | null
  profile_photo: string | null
  verification_level: 'basic' | 'verified' | 'trusted'
  bio: string | null
  city: string | null
  created_at: string
}

export function LatestMembersSection() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchMembers() {
      try {
        const response = await fetch('/api/profiles/public')
        if (response.ok) {
          const data = await response.json()
          setMembers(data.profiles || [])
        } else {
          setError(true)
        }
      } catch (err) {
        clientLogger.error('Error fetching latest members', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [])

  const getDelayClass = (index: number) => {
    const delays = ['delay-100', 'delay-200', 'delay-300', 'delay-400']
    return delays[index % delays.length]
  }

  // Hide section entirely if we have fewer than 2 cards to show
  if (!loading && !error && members.length < 2) {
    return null
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-surface">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12" data-animate>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-4">
            Meet Some Members
          </h2>
          <p className="text-lg text-on-surface-variant max-w-2xl mx-auto">
            Recently joined Canadians looking for the right living situation.
            Sign up to browse everyone.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-outline-variant mx-auto mb-4" />
            <p className="text-on-surface-variant">
              Unable to load members. Please try again later.
            </p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {members.slice(0, 4).map((member, index) => (
                <div
                  key={member.user_id}
                  data-animate
                  className={getDelayClass(index)}
                >
                  <Link href={`/signup?redirect=/profile/${member.user_id}`}>
                    <Card variant="bordered" className="overflow-hidden feature-card group h-full">
                      <div className="relative aspect-[4/5] bg-surface-container-low overflow-hidden">
                        {member.profile_photo ? (
                          <img
                            src={member.profile_photo}
                            alt={member.name || 'Member'}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Users className="h-12 w-12 text-outline" />
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-on-surface truncate">
                            {member.name || 'Anonymous'}
                          </h3>
                          {member.verification_level !== 'basic' && (
                            <VerificationBadge
                              level={member.verification_level}
                              size="sm"
                              showLabel={false}
                            />
                          )}
                        </div>
                        {member.city && (
                          <div className="flex items-center gap-1 text-sm text-on-surface-variant">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{member.city}</span>
                          </div>
                        )}
                        {member.bio && (
                          <p className="text-sm text-on-surface-variant line-clamp-2">
                            {member.bio}
                          </p>
                        )}
                      </div>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>

            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 delay-500"
              data-animate
            >
              <Link href="/signup">
                <Button variant="primary" size="lg">
                  Sign up to browse members
                  <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
