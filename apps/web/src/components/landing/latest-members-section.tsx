'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { clientLogger } from '@/lib/client-logger'
import { Users, ArrowRight, Loader2, MapPin, BadgeCheck } from 'lucide-react'

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

  if (!loading && !error && members.length < 2) return null

  return (
    <section className="py-24 lg:py-32 bg-surface-container-low relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(255,220,196,0.45), transparent 70%)',
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12" data-animate>
          <div className="max-w-2xl">
            <span className="text-secondary font-bold tracking-widest uppercase text-xs">
              Real people
            </span>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-primary mt-3 leading-[1.05]">
              Meet the neighbours
              <br />
              you haven&rsquo;t met yet.
            </h2>
            <p className="mt-4 text-lg text-on-surface-variant">
              Recently joined Canadians looking for the right living situation.
            </p>
          </div>
          <Link
            href="/signup"
            className="px-5 py-3 text-sm font-semibold rounded-xl bg-primary text-on-primary hover:bg-primary-container flex items-center gap-2 transition-colors"
          >
            Browse all members
            <ArrowRight className="w-4 h-4" />
          </Link>
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {members.slice(0, 4).map((m) => (
              <Link
                key={m.user_id}
                href={`/signup?redirect=/profile/${m.user_id}`}
                className="group bg-background rounded-3xl overflow-hidden ring-1 ring-outline-variant/30 hover:-translate-y-1 transition-transform"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-surface-container">
                  {m.profile_photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.profile_photo}
                      alt={m.name || 'Member'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center">
                      <Users className="w-12 h-12 text-outline" />
                    </div>
                  )}
                  {m.verification_level !== 'basic' && (
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur flex items-center gap-1">
                      <BadgeCheck className="w-3.5 h-3.5 text-secondary" />
                      <span className="text-[10px] font-bold text-primary capitalize">
                        {m.verification_level}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                    <h3 className="font-display font-bold text-white truncate">
                      {m.name || 'Anonymous'}
                    </h3>
                    {m.city && (
                      <div className="text-[11px] text-white/80 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {m.city}
                      </div>
                    )}
                  </div>
                </div>
                {m.bio && (
                  <div className="p-4">
                    <p className="text-sm text-on-surface-variant line-clamp-2 leading-relaxed">
                      {m.bio}
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
