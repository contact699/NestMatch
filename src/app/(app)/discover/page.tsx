'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { clientLogger } from '@/lib/client-logger'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { VerificationBadge } from '@/components/ui/badge'
import { CompatibilityBadgeStatic } from '@/components/ui/compatibility-badge'
import { SuggestedGroupCard } from '@/components/discover/SuggestedGroupCard'
import { DiscoverTabs, type TabId } from '@/components/discover/DiscoverTabs'
import {
  Sparkles,
  Users,
  RefreshCw,
  MapPin,
  MessageCircle,
  Settings,
  AlertCircle,
  Search,
  Filter,
  DollarSign,
  Calendar,
  X,
  Info,
} from 'lucide-react'
import { CANADIAN_PROVINCES, CITIES_BY_PROVINCE } from '@/lib/utils'

interface MemberProfile {
  userId: string
  name: string | null
  profilePhoto: string | null
  verificationLevel: 'basic' | 'verified' | 'trusted'
  city: string | null
  province: string | null
}

interface Suggestion {
  id: string
  members: string[]
  memberProfiles: MemberProfile[]
  practicalScore: number
  compatibilityScore: number
  trustScore: number
  combinedScore: number
  matchCriteria: {
    budgetOverlap: { min: number; max: number }
    commonCities: string[]
    dateRange: { earliest: string; latest: string }
  }
}

interface Profile {
  user_id: string
  name: string | null
  bio: string | null
  profile_photo: string | null
  verification_level: string
  age: number | null
  gender: 'male' | 'female' | 'non_binary' | 'other' | 'prefer_not_to_say' | null
  city: string | null
  province: string | null
  budget_min?: number | null
  budget_max?: number | null
}

interface ProfileWithScore extends Profile {
  compatibilityScore: number
}

interface PublicGroup {
  id: string
  name: string
  description: string | null
  combined_budget_min: number | null
  combined_budget_max: number | null
  target_move_date: string | null
  preferred_cities: string[] | null
  member_count: number
  members: Array<{
    user: {
      name: string | null
      profile_photo: string | null
      verification_level: string
    }
  }>
}

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState<TabId>('suggestions')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Suggestions state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [nextRefreshAt, setNextRefreshAt] = useState<string | null>(null)

  // People state
  const [profiles, setProfiles] = useState<ProfileWithScore[]>([])

  // Groups state
  const [publicGroups, setPublicGroups] = useState<PublicGroup[]>([])

  // People filters
  const [peopleFilters, setPeopleFilters] = useState({
    province: '',
    city: '',
    gender: '',
    ageMin: '',
    ageMax: '',
    budgetMin: '',
    budgetMax: '',
    searchQuery: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  // Counts
  const [counts, setCounts] = useState({
    suggestions: 0,
    people: 0,
    groups: 0,
  })

  const fetchSuggestions = useCallback(async () => {
    try {
      const response = await fetch('/api/suggestions')
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
        setCounts(prev => ({ ...prev, suggestions: data.suggestions?.length || 0 }))
      }
    } catch (error) {
      clientLogger.error('Error fetching suggestions', error)
    }
  }, [])

  const fetchProfiles = useCallback(async (userId: string) => {
    const supabase = createClient()

    // Fetch more profiles initially since we'll filter out incomplete ones
    const { data: allProfilesData } = await supabase
      .from('profiles')
      .select('*')
      .neq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!allProfilesData) return

    // Check which users have completed the lifestyle quiz
    const { data: quizUsers } = await supabase
      .from('lifestyle_responses')
      .select('user_id')
      .in('user_id', allProfilesData.map((p: Profile) => p.user_id))

    const quizTakenUserIds = new Set((quizUsers || []).map((q: { user_id: string }) => q.user_id))

    // Filter to only quality profiles:
    // Path A: decent profile (has name + has photo + has taken quiz)
    // Path B: verified identity (email verified OR phone verified OR verification_level above basic)
    const profilesData = allProfilesData.filter((p: any) => {
      const hasName = !!p.name
      const hasPhoto = !!p.profile_photo || (Array.isArray(p.photos) && p.photos.length > 0)
      const hasQuiz = quizTakenUserIds.has(p.user_id)
      const isDecentProfile = hasName && hasPhoto && hasQuiz

      const isVerified = p.email_verified || p.phone_verified ||
        p.verification_level === 'verified' || p.verification_level === 'trusted'

      return isDecentProfile || isVerified
    }).slice(0, 30)

    // Fetch budget ranges from seeking profiles for filtering
    const { data: seekingProfilesData } = await supabase
      .from('seeking_profiles')
      .select('user_id, budget_min, budget_max')
      .in('user_id', profilesData.map((p: Profile) => p.user_id))

    const budgetsByUserId = new Map<string, { budget_min: number | null; budget_max: number | null }>(
      (seekingProfilesData || []).map((s: any) => [
        s.user_id,
        { budget_min: s.budget_min ?? null, budget_max: s.budget_max ?? null },
      ])
    )

    // Get compatibility scores
    const userIds = profilesData.map((p: Profile) => p.user_id)
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

    const profilesWithScores: ProfileWithScore[] = profilesData.map((p: Profile) => ({
      ...p,
      budget_min: budgetsByUserId.get(p.user_id)?.budget_min ?? null,
      budget_max: budgetsByUserId.get(p.user_id)?.budget_max ?? null,
      compatibilityScore: scores[p.user_id] || 0,
    }))

    profilesWithScores.sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    setProfiles(profilesWithScores)
    setCounts(prev => ({ ...prev, people: profilesWithScores.length }))
  }, [])

  const fetchPublicGroups = useCallback(async () => {
    const supabase = createClient()

    const { data: groups } = await supabase
      .from('co_renter_groups')
      .select(`
        *,
        members:co_renter_members(
          user:profiles(name, profile_photo, verification_level)
        )
      `)
      .eq('is_public', true)
      .eq('status', 'forming')
      .order('created_at', { ascending: false })
      .limit(20)

    if (groups) {
      const enriched = groups.map((g: any) => ({
        ...g,
        member_count: g.members?.length || 0,
      }))
      setPublicGroups(enriched)
      setCounts(prev => ({ ...prev, groups: enriched.length }))
    }
  }, [])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      setCurrentUserId(user.id)

      // Fetch all data in parallel
      await Promise.all([
        fetchSuggestions(),
        fetchProfiles(user.id),
        fetchPublicGroups(),
      ])

      setLoading(false)
    }

    init()
  }, [fetchSuggestions, fetchProfiles, fetchPublicGroups])

  const handleRefreshSuggestions = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/suggestions', { method: 'POST' })
      const data = await response.json()

      if (response.status === 429) {
        setNextRefreshAt(data.nextRefreshAt)
        toast.error('Please wait before refreshing again')
      } else if (response.ok) {
        await fetchSuggestions()
        toast.success('Suggestions refreshed')
      }
    } catch (error) {
      clientLogger.error('Error refreshing suggestions', error)
      toast.error('Failed to refresh suggestions')
    } finally {
      setRefreshing(false)
    }
  }

  const handleInterest = async (suggestionId: string) => {
    try {
      const response = await fetch(`/api/suggestions/${suggestionId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        const data = await response.json()
        // Remove from suggestions and redirect to group
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
        toast.success('Group created from suggestion!')
        window.location.href = `/groups/${data.groupId}`
      } else {
        toast.error('Failed to create group from suggestion')
      }
    } catch (error) {
      clientLogger.error('Error converting suggestion', error)
      toast.error('Failed to create group from suggestion')
    }
  }

  const handleDismiss = async (suggestionId: string) => {
    try {
      await fetch(`/api/suggestions/${suggestionId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismissed' }),
      })

      setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
      setCounts(prev => ({ ...prev, suggestions: prev.suggestions - 1 }))
      toast.success('Suggestion dismissed')
    } catch (error) {
      clientLogger.error('Error dismissing suggestion', error)
      toast.error('Failed to dismiss suggestion')
    }
  }

  const debouncedFilters = useDebounce(peopleFilters, 300)

  const filteredProfiles = useMemo(() => {
    const minBudgetFilter = debouncedFilters.budgetMin ? parseInt(debouncedFilters.budgetMin, 10) : null
    const maxBudgetFilter = debouncedFilters.budgetMax ? parseInt(debouncedFilters.budgetMax, 10) : null

    return profiles.filter((profile) => {
      if (debouncedFilters.province && profile.province !== debouncedFilters.province) return false
      if (debouncedFilters.city && profile.city !== debouncedFilters.city) return false
      if (debouncedFilters.gender && profile.gender !== debouncedFilters.gender) return false
      if (debouncedFilters.ageMin && profile.age && profile.age < parseInt(debouncedFilters.ageMin, 10)) return false
      if (debouncedFilters.ageMax && profile.age && profile.age > parseInt(debouncedFilters.ageMax, 10)) return false

      if (minBudgetFilter !== null || maxBudgetFilter !== null) {
        const profileMin = profile.budget_min
        const profileMax = profile.budget_max

        if (profileMin === null || profileMin === undefined || profileMax === null || profileMax === undefined) {
          return false
        }

        const overlaps =
          profileMax >= (minBudgetFilter ?? Number.NEGATIVE_INFINITY) &&
          profileMin <= (maxBudgetFilter ?? Number.POSITIVE_INFINITY)

        if (!overlaps) return false
      }

      if (debouncedFilters.searchQuery) {
        const q = debouncedFilters.searchQuery.toLowerCase()
        const name = (profile.name || '').toLowerCase()
        const bio = (profile.bio || '').toLowerCase()
        if (!name.includes(q) && !bio.includes(q)) return false
      }

      return true
    })
  }, [profiles, debouncedFilters])

  if (!currentUserId && !loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in to discover</h2>
          <p className="text-gray-600 mb-4">
            Create an account to get AI-powered group suggestions and find compatible roommates.
          </p>
          <Link href="/login">
            <Button variant="glow">Sign in</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
          <p className="text-gray-600">Find your perfect roommate match</p>
        </div>
        <Link href="/quiz">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1" />
            Matching Preferences
          </Button>
        </Link>
      </div>

      {/* How it works */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700 space-y-1">
            <p className="font-medium text-gray-900">How Discovery Works</p>
            <ul className="space-y-1">
              <li><span className="font-medium">Suggestions</span> — AI-generated group matches based on your profile and preferences</li>
              <li><span className="font-medium">People</span> — Browse individuals ranked by lifestyle compatibility</li>
              <li><span className="font-medium">Groups</span> — Join existing public groups looking for members</li>
            </ul>
            <p className="text-gray-500 pt-1">
              Complete your <Link href="/quiz" className="text-blue-600 hover:underline">lifestyle quiz</Link> and <Link href="/profile/edit" className="text-blue-600 hover:underline">profile</Link> for better matches.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <DiscoverTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
      />

      {/* Content */}
      <div className="mt-6">
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
        ) : (
          <>
            {/* Suggested Groups Tab */}
            {activeTab === 'suggestions' && (
              <div>
                {/* Refresh button */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">
                    {suggestions.length} AI-generated group suggestions
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshSuggestions}
                    disabled={refreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                {nextRefreshAt && (
                  <div className="flex items-center gap-2 p-3 mb-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    <AlertCircle className="h-4 w-4" />
                    Next refresh available at{' '}
                    {new Date(nextRefreshAt).toLocaleTimeString()}
                  </div>
                )}

                {suggestions.length === 0 ? (
                  <div className="text-center py-12">
                    <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No suggestions yet
                    </h3>
                    <p className="text-gray-500 mb-4 max-w-md mx-auto">
                      To get AI-generated group suggestions, complete your{' '}
                      <Link href="/profile/edit" className="text-blue-600 hover:underline">profile</Link>,{' '}
                      <Link href="/quiz" className="text-blue-600 hover:underline">lifestyle quiz</Link>, and{' '}
                      <Link href="/seeking" className="text-blue-600 hover:underline">seeking preferences</Link>, then click below.
                    </p>
                    <Button variant="glow" onClick={handleRefreshSuggestions}>
                      Generate Suggestions
                    </Button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {suggestions.map(suggestion => (
                      <SuggestedGroupCard
                        key={suggestion.id}
                        suggestionId={suggestion.id}
                        members={suggestion.memberProfiles}
                        practicalScore={suggestion.practicalScore}
                        compatibilityScore={suggestion.compatibilityScore}
                        trustScore={suggestion.trustScore}
                        combinedScore={suggestion.combinedScore}
                        matchCriteria={suggestion.matchCriteria}
                        currentUserId={currentUserId!}
                        onInterest={() => handleInterest(suggestion.id)}
                        onDismiss={() => handleDismiss(suggestion.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Compatible People Tab */}
            {activeTab === 'people' && (
              <div>
                {/* Filters Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-500">
                      {`${filteredProfiles.length} compatible people found`}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="h-4 w-4 mr-1" />
                      Filters
                      {Object.values(peopleFilters).some(v => v !== '') && (
                        <span className="ml-1 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                          {Object.values(peopleFilters).filter(v => v !== '').length}
                        </span>
                      )}
                    </Button>
                  </div>

                  {showFilters && (
                    <Card variant="bordered" className="p-4 mb-4">
                      <div className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={peopleFilters.searchQuery}
                            onChange={(e) => setPeopleFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                            placeholder="Search by name or bio..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {/* Province */}
                          <select
                            value={peopleFilters.province}
                            onChange={(e) => {
                              setPeopleFilters(prev => ({ ...prev, province: e.target.value, city: '' }))
                            }}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">All Provinces</option>
                            {CANADIAN_PROVINCES.map(p => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </select>

                          {/* City */}
                          <select
                            value={peopleFilters.city}
                            onChange={(e) => setPeopleFilters(prev => ({ ...prev, city: e.target.value }))}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">{peopleFilters.province ? 'All Cities' : 'Select Province'}</option>
                            {(CITIES_BY_PROVINCE[peopleFilters.province] || []).map(city => (
                              <option key={city} value={city}>{city}</option>
                            ))}
                          </select>

                          {/* Gender */}
                          <select
                            value={peopleFilters.gender}
                            onChange={(e) => setPeopleFilters(prev => ({ ...prev, gender: e.target.value }))}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Any Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="non_binary">Non-binary</option>
                            <option value="other">Other</option>
                          </select>

                          {/* Age Range */}
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={peopleFilters.ageMin}
                              onChange={(e) => setPeopleFilters(prev => ({ ...prev, ageMin: e.target.value }))}
                              placeholder="Age min"
                              min="18"
                              max="120"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="number"
                              value={peopleFilters.ageMax}
                              onChange={(e) => setPeopleFilters(prev => ({ ...prev, ageMax: e.target.value }))}
                              placeholder="Age max"
                              min="18"
                              max="120"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Budget Range */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="number"
                              value={peopleFilters.budgetMin}
                              onChange={(e) => setPeopleFilters(prev => ({ ...prev, budgetMin: e.target.value }))}
                              placeholder="Budget min"
                              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="number"
                              value={peopleFilters.budgetMax}
                              onChange={(e) => setPeopleFilters(prev => ({ ...prev, budgetMax: e.target.value }))}
                              placeholder="Budget max"
                              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Clear Filters */}
                        {Object.values(peopleFilters).some(v => v !== '') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPeopleFilters({
                              province: '', city: '', gender: '', ageMin: '', ageMax: '',
                              budgetMin: '', budgetMax: '', searchQuery: '',
                            })}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Clear All Filters
                          </Button>
                        )}
                      </div>
                    </Card>
                  )}
                </div>

                {filteredProfiles.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No profiles found
                    </h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      {Object.values(peopleFilters).some(v => v !== '')
                        ? 'Try adjusting your filters to see more results.'
                        : (
                          <>
                            Complete your <Link href="/quiz" className="text-blue-600 hover:underline">lifestyle quiz</Link> to see
                            compatibility scores and get ranked matches.
                          </>
                        )}
                    </p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProfiles.map(profile => (
                      <Card key={profile.user_id} variant="bordered" animate>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
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

                          {profile.compatibilityScore > 0 && (
                            <div className="mb-4">
                              <CompatibilityBadgeStatic
                                score={profile.compatibilityScore}
                                size="md"
                                showLabel
                              />
                            </div>
                          )}

                          {profile.bio && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                              {profile.bio}
                            </p>
                          )}

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
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Public Groups Tab */}
            {activeTab === 'groups' && (
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  {publicGroups.length} public groups looking for members
                </p>

                {publicGroups.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No public groups yet
                    </h3>
                    <p className="text-gray-500 mb-4 max-w-md mx-auto">
                      No public groups are forming right now. Create a group and set it to public so others can find and join you.
                    </p>
                    <Link href="/groups">
                      <Button variant="glow">Create a Group</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {publicGroups.map(group => (
                      <Card key={group.id} variant="bordered" animate>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="flex -space-x-2">
                              {group.members.slice(0, 3).map((m, i) => (
                                <div
                                  key={i}
                                  className="w-10 h-10 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center overflow-hidden"
                                  style={{ zIndex: 3 - i }}
                                >
                                  {m.user?.profile_photo ? (
                                    <img
                                      src={m.user.profile_photo}
                                      alt={m.user.name || 'Member'}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Users className="h-4 w-4 text-blue-600" />
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {group.name}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>

                          {group.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                              {group.description}
                            </p>
                          )}

                          {group.preferred_cities && group.preferred_cities.length > 0 && (
                            <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">
                                {group.preferred_cities.slice(0, 2).join(', ')}
                              </span>
                            </div>
                          )}

                          {(group.combined_budget_min || group.combined_budget_max) && (
                            <p className="text-sm text-gray-500 mb-4">
                              Budget: ${group.combined_budget_min?.toLocaleString()} - ${group.combined_budget_max?.toLocaleString()}/mo
                            </p>
                          )}

                          <div className="pt-4 border-t border-gray-100">
                            <Link href={`/groups/${group.id}`}>
                              <Button variant="glow" className="w-full" size="sm">
                                View Group
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
