'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
} from 'lucide-react'

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
  city: string | null
  province: string | null
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
      console.error('Error fetching suggestions:', error)
    }
  }, [])

  const fetchProfiles = useCallback(async (userId: string) => {
    const supabase = createClient()

    const { data: profilesData } = await (supabase as any)
      .from('profiles')
      .select('*')
      .neq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (!profilesData) return

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
      compatibilityScore: scores[p.user_id] || 0,
    }))

    profilesWithScores.sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    setProfiles(profilesWithScores)
    setCounts(prev => ({ ...prev, people: profilesWithScores.length }))
  }, [])

  const fetchPublicGroups = useCallback(async () => {
    const supabase = createClient()

    const { data: groups } = await (supabase as any)
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
      } else if (response.ok) {
        await fetchSuggestions()
      }
    } catch (error) {
      console.error('Error refreshing suggestions:', error)
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
        window.location.href = `/groups/${data.groupId}`
      }
    } catch (error) {
      console.error('Error converting suggestion:', error)
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
    } catch (error) {
      console.error('Error dismissing suggestion:', error)
    }
  }

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
        <Link href="/settings">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1" />
            Preferences
          </Button>
        </Link>
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
                    <p className="text-gray-500 mb-4">
                      Complete your seeking profile to get personalized group suggestions.
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
                <p className="text-sm text-gray-500 mb-4">
                  {profiles.length} compatible people found
                </p>

                {profiles.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No profiles found
                    </h3>
                    <p className="text-gray-500">
                      Complete your lifestyle quiz to see compatible matches.
                    </p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {profiles.map(profile => (
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
                      No public groups
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Be the first to create a public group!
                    </p>
                    <Link href="/groups">
                      <Button variant="glow">Create Group</Button>
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
