'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { clientLogger } from '@/lib/client-logger'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VerificationBadge } from '@/components/ui/badge'
import { CompatibilityBadgeStatic } from '@/components/ui/compatibility-badge'
import {
  Search,
  Users,
  MapPin,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { CANADIAN_PROVINCES, CITIES_BY_PROVINCE, LANGUAGES } from '@/lib/utils'
import { SaveProfileButton } from '@/components/profile/save-profile-button'

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
  gender: string | null
  occupation: string | null
  age: number | null
  created_at: string
}

interface ProfileWithScore extends Profile {
  compatibilityScore: number
}

interface LifestyleSummary {
  smoking: string | null
  pets_preference: string | null
}

const EMPTY_FILTERS = {
  city: '',
  province: '',
  search: '',
  verificationLevel: '',
  minCompatibility: '',
  gender: '',
  language: '',
  smoking: '',
  petsPreference: '',
}

export default function RoommatesPage() {
  const [profiles, setProfiles] = useState<ProfileWithScore[]>([])
  const [lifestyleByUser, setLifestyleByUser] = useState<Record<string, LifestyleSummary>>({})
  const [savedUserIds, setSavedUserIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
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
    const { data: profilesData, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50) as { data: Profile[] | null; error: any }

    if (error) {
      clientLogger.error('Error fetching profiles', error)
      setLoading(false)
      return
    }

    if (!profilesData || profilesData.length === 0) {
      setProfiles([])
      setLoading(false)
      return
    }

    // Get compatibility scores + lifestyle responses + this viewer's saved
    // profile set in parallel.
    const userIds = profilesData.map(p => p.user_id)
    const [scoresRes, lifestyleRes, savedRes] = await Promise.all([
      fetch('/api/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds }),
      }),
      supabase
        .from('lifestyle_responses')
        .select('user_id, smoking, pets_preference')
        .in('user_id', userIds),
      (supabase as any)
        .from('saved_profiles')
        .select('saved_user_id')
        .eq('user_id', user.id)
        .in('saved_user_id', userIds),
    ])

    setSavedUserIds(
      new Set(((savedRes?.data as Array<{ saved_user_id: string }> | null) || []).map((r) => r.saved_user_id))
    )

    let scores: Record<string, number> = {}
    if (scoresRes.ok) {
      const data = await scoresRes.json()
      scores = data.scores || {}
    }

    const lifestyleMap: Record<string, LifestyleSummary> = {}
    for (const row of (lifestyleRes.data || []) as Array<{
      user_id: string
      smoking: string | null
      pets_preference: string | null
    }>) {
      lifestyleMap[row.user_id] = { smoking: row.smoking, pets_preference: row.pets_preference }
    }
    setLifestyleByUser(lifestyleMap)

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
    if (filters.verificationLevel && profile.verification_level !== filters.verificationLevel) {
      return false
    }
    if (filters.minCompatibility) {
      const minScore = parseInt(filters.minCompatibility)
      if (profile.compatibilityScore < minScore) {
        return false
      }
    }
    if (filters.gender && profile.gender !== filters.gender) {
      return false
    }
    if (filters.language) {
      const langs = (profile.languages || []).map((l) => l.toLowerCase())
      if (!langs.includes(filters.language.toLowerCase())) {
        return false
      }
    }
    if (filters.smoking || filters.petsPreference) {
      const lifestyle = lifestyleByUser[profile.user_id]
      if (filters.smoking && lifestyle?.smoking !== filters.smoking) {
        return false
      }
      if (filters.petsPreference && lifestyle?.pets_preference !== filters.petsPreference) {
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
          <Users className="h-12 w-12 text-on-surface-variant/30 mx-auto mb-4" />
          <h2 className="text-xl font-display font-semibold text-on-surface mb-2">Sign in to find roommates</h2>
          <p className="text-on-surface-variant mb-4">
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
        <h1 className="text-4xl font-display font-bold text-on-surface mb-2">
          Find your sanctuary.
        </h1>
        <p className="text-on-surface-variant text-lg max-w-2xl">
          Discover roommates who share your values and lifestyle. Our curated matchmaking brings intentionality to your search.
        </p>
      </div>

      {/* Search & Filter pills */}
      <div className="mb-8 space-y-4" data-animate>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by name, bio, or city..."
              className="w-full pl-10 pr-4 py-2.5 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent bg-surface-container-lowest backdrop-blur-sm transition-all text-on-surface placeholder:text-on-surface-variant"
            />
          </div>

          {/* Filter pills row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Province pill */}
            <select
              value={filters.province}
              onChange={(e) => {
                const newProvince = e.target.value
                const availableCities = newProvince ? CITIES_BY_PROVINCE[newProvince] || [] : []
                const newCity = availableCities.includes(filters.city) ? filters.city : ''
                setFilters({ ...filters, province: newProvince, city: newCity })
              }}
              className="px-4 py-2 ghost-border rounded-full bg-surface-container-lowest text-sm text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary transition-all hover:bg-surface-container-low appearance-none cursor-pointer"
            >
              <option value="">Province</option>
              {CANADIAN_PROVINCES.map((province) => (
                <option key={province.value} value={province.value}>
                  {province.label}
                </option>
              ))}
            </select>

            {/* City pill */}
            <select
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              className="px-4 py-2 ghost-border rounded-full bg-surface-container-lowest text-sm text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary transition-all hover:bg-surface-container-low appearance-none cursor-pointer"
            >
              <option value="">{filters.province ? 'City' : 'City'}</option>
              {(filters.province ? CITIES_BY_PROVINCE[filters.province] || [] : []).map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            {/* Profile type pill */}
            <select
              value={filters.verificationLevel}
              onChange={(e) => setFilters({ ...filters, verificationLevel: e.target.value })}
              className="px-4 py-2 ghost-border rounded-full bg-surface-container-lowest text-sm text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary transition-all hover:bg-surface-container-low appearance-none cursor-pointer"
            >
              <option value="">All Profiles</option>
              <option value="trusted">Trusted</option>
              <option value="verified">ID Verified</option>
              <option value="basic">Unverified</option>
            </select>

            {/* More filters toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-full"
            >
              <SlidersHorizontal className="h-4 w-4" />
              More
            </Button>
          </div>
        </div>

        {/* Expanded filters */}
        <div className={`overflow-hidden transition-all duration-300 ${showFilters ? 'max-h-[32rem] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-4 bg-surface-container-low rounded-2xl">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Gender</label>
                <select
                  value={filters.gender}
                  onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                  className="w-full px-3 py-2 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all hover:bg-surface-container bg-surface-container-lowest text-on-surface"
                >
                  <option value="">Any Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non_binary">Non-binary</option>
                </select>
              </div>

              {/* Min Compatibility */}
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Min Compatibility</label>
                <select
                  value={filters.minCompatibility}
                  onChange={(e) => setFilters({ ...filters, minCompatibility: e.target.value })}
                  className="w-full px-3 py-2 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all hover:bg-surface-container bg-surface-container-lowest text-on-surface"
                >
                  <option value="">Any Score</option>
                  <option value="80">80%+ (Great match)</option>
                  <option value="60">60%+ (Good match)</option>
                  <option value="40">40%+ (Fair match)</option>
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Language</label>
                <select
                  value={filters.language}
                  onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                  className="w-full px-3 py-2 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all hover:bg-surface-container bg-surface-container-lowest text-on-surface"
                >
                  <option value="">Any Language</option>
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              {/* Smoking */}
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Smoking</label>
                <select
                  value={filters.smoking}
                  onChange={(e) => setFilters({ ...filters, smoking: e.target.value })}
                  className="w-full px-3 py-2 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all hover:bg-surface-container bg-surface-container-lowest text-on-surface"
                >
                  <option value="">Any</option>
                  <option value="never">Non-smoker</option>
                  <option value="outside_only">Outside only</option>
                  <option value="yes">Smoker</option>
                </select>
              </div>

              {/* Pets */}
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Pets</label>
                <select
                  value={filters.petsPreference}
                  onChange={(e) => setFilters({ ...filters, petsPreference: e.target.value })}
                  className="w-full px-3 py-2 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all hover:bg-surface-container bg-surface-container-lowest text-on-surface"
                >
                  <option value="">Any</option>
                  <option value="no_pets">No pets</option>
                  <option value="cats_ok">Cats OK</option>
                  <option value="dogs_ok">Dogs OK</option>
                  <option value="all_pets_ok">All pets OK</option>
                  <option value="have_pets">Has pets</option>
                </select>
              </div>

              {/* Clear filters */}
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="text-sm"
                >
                  Clear filters
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} variant="bordered" className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-surface-container rounded-full" />
                  <div className="flex-1">
                    <div className="h-5 w-24 bg-surface-container rounded mb-2" />
                    <div className="h-4 w-16 bg-surface-container rounded" />
                  </div>
                </div>
                <div className="h-4 w-full bg-surface-container rounded mb-2" />
                <div className="h-4 w-3/4 bg-surface-container rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-12" data-animate>
          <Users className="h-12 w-12 text-on-surface-variant/30 mx-auto mb-4" />
          <h3 className="text-lg font-display font-medium text-on-surface mb-2">No roommates found</h3>
          <p className="text-on-surface-variant mb-4">
            Try adjusting your filters or check back later.
          </p>
          {Object.values(filters).some((v) => v !== '') && (
            <Button
              variant="outline"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-on-surface-variant mb-4" data-animate>
            {filteredProfiles.length} potential roommate{filteredProfiles.length !== 1 ? 's' : ''} found
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile, index) => (
              <div key={profile.id} data-animate className={getDelayClass(index)}>
                <Card
                  variant="bordered"
                  animate
                  className="relative"
                >
                  {/* Save heart — top-right corner. Floats over the card so it
                      stays out of the way of the compatibility badge / photo. */}
                  <div className="absolute top-3 right-3 z-10">
                    <SaveProfileButton
                      savedUserId={profile.user_id}
                      isSavedInitial={savedUserIds.has(profile.user_id)}
                      isLoggedIn={!!currentUserId}
                      variant="icon"
                    />
                  </div>
                  <CardContent className="p-6">
                    {/* Compatibility badge at top */}
                    {profile.compatibilityScore > 0 && (
                      <div className="mb-4 pr-10">
                        <CompatibilityBadgeStatic
                          score={profile.compatibilityScore}
                          size="md"
                          showLabel={true}
                        />
                      </div>
                    )}

                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-20 h-20 bg-secondary-container rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 transition-transform duration-300 hover:scale-105">
                        {profile.profile_photo ? (
                          <img
                            src={profile.profile_photo}
                            alt={profile.name || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="h-8 w-8 text-secondary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-on-surface truncate text-lg">
                          {profile.name || 'Anonymous'}
                        </h3>
                        {profile.occupation && (
                          <p className="text-sm text-on-surface-variant">{profile.occupation}</p>
                        )}
                        {profile.age && (
                          <p className="text-sm text-on-surface-variant">Age {profile.age}</p>
                        )}
                        <VerificationBadge
                          level={(profile.verification_level || 'basic') as 'basic' | 'verified' | 'trusted'}
                          size="sm"
                        />
                        {(profile.city || profile.province) && (
                          <div className="flex items-center gap-1 text-sm text-on-surface-variant mt-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">
                              {[profile.city, profile.province].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    {profile.bio && (
                      <p className="text-sm text-on-surface-variant line-clamp-2 mb-4">
                        {profile.bio}
                      </p>
                    )}

                    {/* Languages as tags */}
                    {profile.languages && profile.languages.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {profile.languages.slice(0, 3).map((lang) => (
                          <span key={lang} className="text-xs px-2.5 py-1 bg-surface-container-low text-on-surface-variant rounded-full">
                            {lang}
                          </span>
                        ))}
                        {profile.languages.length > 3 && (
                          <span className="text-xs px-2.5 py-1 bg-surface-container-low text-on-surface-variant rounded-full">
                            +{profile.languages.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-4 ghost-border-t">
                      <Link href={`/profile/${profile.user_id}`} className="block">
                        <Button variant="outline" className="w-full" size="sm">
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}

            {/* CTA Card */}
            <div data-animate>
              <Card variant="feature" className="h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-on-surface text-lg mb-2">
                    Don&apos;t see your perfect match?
                  </h3>
                  <p className="text-sm text-on-surface-variant mb-6">
                    Create your profile and let our compatibility-based matchmaking find compatible roommates for you.
                  </p>
                  <Link href="/profile/edit">
                    <Button variant="glow">
                      Create My Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
