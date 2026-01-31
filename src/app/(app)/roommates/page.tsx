'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VerificationBadge } from '@/components/ui/badge'
import { CompatibilityBadgeStatic } from '@/components/ui/compatibility-badge'
import {
  Search,
  Users,
  MapPin,
  MessageCircle,
  SlidersHorizontal,
} from 'lucide-react'
import { CANADIAN_PROVINCES, CITIES_BY_PROVINCE } from '@/lib/utils'

interface Profile {
  id: string
  user_id: string
  name: string | null
  bio: string | null
  profile_photo: string | null
  verification_level: string
  city: string | null
  province: string | null
  languages: string[] | null
  created_at: string
}

interface ProfileWithScore extends Profile {
  compatibilityScore: number
}

export default function RoommatesPage() {
  const [profiles, setProfiles] = useState<ProfileWithScore[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    city: '',
    province: '',
    search: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Set up intersection observer for animations
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      containerRef.current?.querySelectorAll('[data-animate]').forEach((el) => {
        el.classList.add('is-visible')
      })
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    containerRef.current?.querySelectorAll('[data-animate]').forEach((el) => {
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [profiles, loading])

  useEffect(() => {
    fetchProfiles()
  }, [])

  async function fetchProfiles() {
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)

    if (!user) {
      setLoading(false)
      return
    }

    // Fetch all profiles except current user
    const { data: profilesData, error } = await (supabase as any)
      .from('profiles')
      .select('*')
      .neq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50) as { data: Profile[] | null; error: any }

    if (error) {
      console.error('Error fetching profiles:', error)
      setLoading(false)
      return
    }

    if (!profilesData || profilesData.length === 0) {
      setProfiles([])
      setLoading(false)
      return
    }

    // Get compatibility scores in batch
    const userIds = profilesData.map(p => p.user_id)
    const response = await fetch('/api/compatibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds }),
    })

    let scores: Record<string, number> = {}
    if (response.ok) {
      const data = await response.json()
      scores = data.scores || {}
    }

    // Combine profiles with scores and sort by compatibility
    const profilesWithScores: ProfileWithScore[] = profilesData.map(profile => ({
      ...profile,
      compatibilityScore: scores[profile.user_id] || 0,
    }))

    // Sort by compatibility score (highest first)
    profilesWithScores.sort((a, b) => b.compatibilityScore - a.compatibilityScore)

    setProfiles(profilesWithScores)
    setLoading(false)
  }

  const filteredProfiles = profiles.filter(profile => {
    if (filters.city && profile.city?.toLowerCase() !== filters.city.toLowerCase()) {
      return false
    }
    if (filters.province && profile.province !== filters.province) {
      return false
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const nameMatch = profile.name?.toLowerCase().includes(searchLower)
      const bioMatch = profile.bio?.toLowerCase().includes(searchLower)
      const cityMatch = profile.city?.toLowerCase().includes(searchLower)
      if (!nameMatch && !bioMatch && !cityMatch) {
        return false
      }
    }
    return true
  })

  // Stagger delay classes
  const getDelayClass = (index: number) => {
    const delays = ['delay-100', 'delay-200', 'delay-300', 'delay-400', 'delay-500', 'delay-600']
    return delays[index % delays.length]
  }

  if (!currentUserId && !loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in to find roommates</h2>
          <p className="text-gray-600 mb-4">
            Create an account and complete your profile to see compatible roommates.
          </p>
          <Link href="/login">
            <Button variant="glow">Sign in</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8" data-animate>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Find Roommates</h1>
        <p className="text-gray-600">
          Browse compatible people based on your lifestyle preferences
        </p>
      </div>

      {/* Search & Filters */}
      <Card variant="glass" className="p-4 mb-8" data-animate>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by name, bio, or city..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all"
            />
          </div>

          {/* Filter toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Expanded filters */}
        <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 overflow-hidden transition-all duration-300 ${showFilters ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 mt-0 pt-0 border-t-0'}`}>
          {/* Province - First for filtering cities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
            <select
              value={filters.province}
              onChange={(e) => {
                const newProvince = e.target.value
                // Reset city if current city is not in new province
                const availableCities = newProvince ? CITIES_BY_PROVINCE[newProvince] || [] : []
                const newCity = availableCities.includes(filters.city) ? filters.city : ''
                setFilters({ ...filters, province: newProvince, city: newCity })
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:border-gray-300"
            >
              <option value="">All Provinces</option>
              {CANADIAN_PROVINCES.map((province) => (
                <option key={province.value} value={province.value}>
                  {province.label}
                </option>
              ))}
            </select>
          </div>

          {/* City - Filtered by province */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <select
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:border-gray-300"
            >
              <option value="">{filters.province ? 'All Cities' : 'Select Province First'}</option>
              {(filters.province ? CITIES_BY_PROVINCE[filters.province] || [] : []).map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Clear filters */}
          <div className="flex items-end">
            <Button
              variant="ghost"
              onClick={() => setFilters({ city: '', province: '', search: '' })}
              className="text-sm"
            >
              Clear filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} variant="bordered" className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-5 w-24 bg-gray-200 rounded mb-2" />
                    <div className="h-4 w-16 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="h-4 w-full bg-gray-200 rounded mb-2" />
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-12" data-animate>
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No roommates found</h3>
          <p className="text-gray-500 mb-4">
            Try adjusting your filters or check back later.
          </p>
          {(filters.city || filters.province || filters.search) && (
            <Button
              variant="outline"
              onClick={() => setFilters({ city: '', province: '', search: '' })}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4" data-animate>
            {filteredProfiles.length} potential roommate{filteredProfiles.length !== 1 ? 's' : ''} found
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile, index) => (
              <div key={profile.id} data-animate className={getDelayClass(index)}>
                <Card
                  variant="bordered"
                  animate
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 transition-transform duration-300 hover:scale-105">
                        {profile.profile_photo ? (
                          <img
                            src={profile.profile_photo}
                            alt={profile.name || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="h-8 w-8 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {profile.name || 'Anonymous'}
                        </h3>
                        <VerificationBadge
                          level={(profile.verification_level || 'basic') as 'basic' | 'verified' | 'trusted'}
                          size="sm"
                        />
                        {(profile.city || profile.province) && (
                          <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">
                              {[profile.city, profile.province].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Compatibility score */}
                    {profile.compatibilityScore > 0 && (
                      <div className="mb-4">
                        <CompatibilityBadgeStatic
                          score={profile.compatibilityScore}
                          size="md"
                          showLabel={true}
                        />
                      </div>
                    )}

                    {/* Bio */}
                    {profile.bio && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                        {profile.bio}
                      </p>
                    )}

                    {/* Languages */}
                    {profile.languages && profile.languages.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-1">Languages</p>
                        <p className="text-sm text-gray-700">
                          {profile.languages.slice(0, 3).join(', ')}
                          {profile.languages.length > 3 && ` +${profile.languages.length - 3} more`}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <Link href={`/profile/${profile.user_id}`} className="flex-1">
                        <Button variant="outline" className="w-full" size="sm">
                          View Profile
                        </Button>
                      </Link>
                      <Link href={`/messages?to=${profile.user_id}`} className="flex-1">
                        <Button variant="glow" className="w-full" size="sm">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Message
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
