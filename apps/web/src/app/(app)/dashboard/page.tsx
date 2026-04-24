import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AnimatedPage } from '@/components/ui/animated-page'
import {
  Search,
  PlusCircle,
  Heart,
  Bookmark,
  ShieldCheck,
  ChevronRight,
  MessageCircle,
  Home,
  CheckCircle,
  TrendingUp,
} from 'lucide-react'

type ProfileData = {
  name: string | null
  bio: string | null
  age: number | null
  gender: string | null
  occupation: string | null
  profile_photo: string | null
  phone: string | null
  city: string | null
  province: string | null
  verification_level: 'basic' | 'verified' | 'trusted'
  languages: string[] | null
}

export const metadata = {
  title: 'Dashboard',
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile with more fields for completeness calculation
  const { data: profile } = (await supabase
    .from('profiles')
    .select(
      'name, bio, age, gender, occupation, profile_photo, phone, city, province, verification_level, languages'
    )
    .eq('user_id', user.id)
    .single()) as { data: ProfileData | null }

  // Fetch lifestyle responses
  const { data: lifestyleResponses } = (await supabase
    .from('lifestyle_responses')
    .select('id')
    .eq('user_id', user.id)
    .single()) as { data: { id: string } | null }

  // Fetch verification status
  const { data: verifications } = (await supabase
    .from('verifications')
    .select('status')
    .eq('user_id', user.id)
    .eq('status', 'completed')) as { data: { status: string }[] | null }

  // Batch fetch: counts, activity, listings for views
  const [
    listingsResult,
    ,
    conversationsResult,
    recentMessagesResult,
    listingsViewsResult,
    recentListingUpdatesResult,
  ] = await Promise.all([
    // Active listings count
    supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    // Saved listings count
    supabase
      .from('saved_listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    // Conversations count (as match proxy)
    supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .contains('participant_ids', [user.id]),
    // Recent messages (for activity feed)
    supabase
      .from('messages')
      .select('id, content, sender_id, created_at')
      .neq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    // Sum of views from user listings
    supabase
      .from('listings')
      .select('views_count')
      .eq('user_id', user.id),
    // Recent listing updates (for activity feed)
    supabase
      .from('listings')
      .select('id, title, updated_at, created_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(3),
  ])

  const listingsCount = listingsResult.count ?? 0
  const conversationsCount = conversationsResult.count ?? 0

  // Calculate total profile views from listings
  const totalProfileViews =
    listingsViewsResult.data?.reduce((sum, l) => sum + (l.views_count ?? 0), 0) ?? 0

  // Build recent activity items
  type ActivityItem = {
    id: string
    icon: 'message' | 'listing' | 'verified'
    title: string
    description: string
    timestamp: string
    isNew: boolean
  }

  const activityItems: ActivityItem[] = []

  // Add recent messages
  if (recentMessagesResult.data) {
    for (const msg of recentMessagesResult.data.slice(0, 3)) {
      activityItems.push({
        id: `msg-${msg.id}`,
        icon: 'message',
        title: 'New message received',
        description:
          msg.content.length > 60 ? `"${msg.content.slice(0, 57)}..."` : `"${msg.content}"`,
        timestamp: msg.created_at,
        isNew: true,
      })
    }
  }

  // Add recent listing updates
  if (recentListingUpdatesResult.data) {
    for (const listing of recentListingUpdatesResult.data.slice(0, 2)) {
      const isNew = listing.created_at === listing.updated_at
      activityItems.push({
        id: `listing-${listing.id}`,
        icon: 'listing',
        title: isNew ? 'Listing Created' : 'Listing Updated',
        description: listing.title,
        timestamp: listing.updated_at,
        isNew: false,
      })
    }
  }

  // Add verification if completed
  if (verifications && verifications.length > 0) {
    activityItems.push({
      id: 'verified',
      icon: 'verified',
      title: 'Identity Verified',
      description: 'Your identity verification was successful.',
      timestamp: new Date().toISOString(),
      isNew: false,
    })
  }

  // Sort by timestamp, most recent first
  activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Calculate profile completeness
  const profileFields = [
    !!profile?.name,
    !!profile?.bio,
    !!profile?.age,
    !!profile?.occupation,
    !!profile?.profile_photo,
    !!profile?.phone,
    !!profile?.city,
    !!profile?.gender,
    !!profile?.languages && profile.languages.length > 0,
    !!lifestyleResponses,
    profile?.verification_level !== 'basic',
  ]
  const filledFields = profileFields.filter(Boolean).length
  const profileCompleteness = Math.round((filledFields / profileFields.length) * 100)

  const profileStatusLabel =
    profileCompleteness === 100
      ? 'COMPLETE'
      : profileCompleteness >= 60
        ? 'IMPROVING'
        : 'GETTING STARTED'

  const profileStatusColor =
    profileCompleteness === 100
      ? 'bg-secondary-container text-on-secondary-container'
      : profileCompleteness >= 60
        ? 'bg-secondary-fixed text-secondary'
        : 'bg-surface-container-high text-on-surface-variant'

  const firstName = profile?.name?.split(' ')[0] ?? ''

  // Build hero subtitle dynamically
  const heroSubtitle =
    conversationsCount > 0 && profile?.city
      ? `You have ${conversationsCount} new match${conversationsCount === 1 ? '' : 'es'} in ${profile.city} tailored to your lifestyle preferences.`
      : profile?.city
        ? `Explore matches in ${profile.city} tailored to your lifestyle preferences.`
        : 'Explore matches tailored to your lifestyle preferences.'

  const isVerified = profile?.verification_level !== 'basic'

  return (
    <AnimatedPage>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* ====== Hero + Profile Strength ====== */}
        <section className="flex flex-col lg:flex-row gap-8 items-stretch" data-animate>
          {/* Hero Card */}
          <div className="flex-1 bg-gradient-to-br from-primary to-primary-container text-white p-10 rounded-2xl relative overflow-hidden shadow-xl">
            {/* Decorative blur */}
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold mb-4 tracking-widest uppercase text-on-primary-container">
                Welcome back{firstName ? `, ${firstName}` : ''}
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-black tracking-tight leading-[1.1] mb-4">
                Find your next <br />
                <span className="text-secondary-container italic">Sanctuary.</span>
              </h2>
              <p className="text-on-primary-container text-lg max-w-md font-light">
                {heroSubtitle}
              </p>
            </div>
            <div className="mt-12 flex flex-wrap gap-4 relative z-10">
              <Link
                href="/roommates"
                className="bg-surface-container-lowest text-primary px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 inline-flex items-center"
              >
                View Matches
              </Link>
              <Link
                href="/listings/new"
                className="bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-xl font-bold text-sm border border-white/20 transition-all hover:bg-white/20 inline-flex items-center"
              >
                Post Listing
              </Link>
            </div>
          </div>

          {/* Profile Strength Card */}
          <div
            className="w-full lg:w-80 bg-surface-container-lowest p-8 rounded-2xl shadow-sm flex flex-col justify-between"
            data-animate
          >
            <div>
              <h3 className="text-lg font-display font-bold text-primary mb-1">
                Profile Strength
              </h3>
              <p className="text-xs text-on-surface-variant mb-6">
                Complete your profile to unlock more matches.
              </p>
              <div className="relative pt-1">
                <div className="flex mb-4 items-center justify-between">
                  <span className="text-3xl font-display font-black text-primary">
                    {profileCompleteness}%
                  </span>
                  <span
                    className={`text-xs font-bold inline-block py-1 px-2 uppercase rounded-full ${profileStatusColor}`}
                  >
                    {profileStatusLabel}
                  </span>
                </div>
                <div className="overflow-hidden h-2.5 mb-4 flex rounded-full bg-surface-container-high">
                  <div
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500"
                    style={{ width: `${profileCompleteness}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {!isVerified && (
                <Link
                  href="/verify"
                  className="flex items-center p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-secondary mr-3" />
                  <span className="text-xs font-medium text-on-surface flex-1">
                    Verify Identity
                  </span>
                  <ChevronRight className="w-4 h-4 text-outline-variant" />
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* ====== Quick Action Cards (4 columns) ====== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" data-animate>
          <Link
            href="/search"
            className="group p-6 bg-surface-container-lowest rounded-2xl hover:shadow-lg transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center mb-6 group-hover:bg-secondary-fixed transition-colors">
              <Search className="w-5 h-5 text-secondary" />
            </div>
            <h4 className="font-display font-bold text-primary mb-2">Find a Room</h4>
            <p className="text-xs text-on-surface-variant">Browse shared listings near you.</p>
          </Link>

          <Link
            href="/listings/new"
            className="group p-6 bg-surface-container-lowest rounded-2xl hover:bg-primary hover:shadow-lg transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center mb-6 group-hover:bg-white/10 transition-colors">
              <PlusCircle className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <h4 className="font-display font-bold text-primary group-hover:text-white mb-2 transition-colors">
              Post a Listing
            </h4>
            <p className="text-xs text-on-surface-variant group-hover:text-primary-fixed-dim transition-colors">
              Find the perfect roommate for your space.
            </p>
          </Link>

          <Link
            href="/roommates"
            className="group p-6 bg-surface-container-lowest rounded-2xl hover:shadow-lg transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center mb-6 group-hover:bg-secondary-fixed transition-colors">
              <Heart className="w-5 h-5 text-secondary fill-secondary" />
            </div>
            <h4 className="font-display font-bold text-primary mb-2">My Matches</h4>
            <p className="text-xs text-on-surface-variant">
              See who you&apos;ve synced with based on vibes.
            </p>
          </Link>

          <Link
            href="/saved"
            className="group p-6 bg-surface-container-lowest rounded-2xl hover:shadow-lg transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center mb-6 group-hover:bg-primary-fixed transition-colors">
              <Bookmark className="w-5 h-5 text-primary fill-primary" />
            </div>
            <h4 className="font-display font-bold text-primary mb-2">Saved</h4>
            <p className="text-xs text-on-surface-variant">
              Access your collection of curated homes.
            </p>
          </Link>
        </section>

        {/* ====== Bottom: Activity + Performance ====== */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8" data-animate>
          {/* Recent Activity Feed */}
          <div className="lg:col-span-2 bg-surface-container rounded-2xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-display font-bold text-primary">Recent Activity</h3>
              <Link
                href="/messages"
                className="text-xs font-bold text-secondary hover:underline"
              >
                View All
              </Link>
            </div>

            {activityItems.length > 0 ? (
              <div className="space-y-6">
                {activityItems.slice(0, 5).map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-start space-x-4 ${index > 0 ? 'opacity-75' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center flex-shrink-0">
                      {item.icon === 'message' && (
                        <MessageCircle className="w-4 h-4 text-secondary" />
                      )}
                      {item.icon === 'listing' && <Home className="w-4 h-4 text-primary" />}
                      {item.icon === 'verified' && (
                        <CheckCircle className="w-4 h-4 text-secondary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary">{item.title}</p>
                      <p className="text-xs text-on-surface-variant truncate">
                        {item.description}
                      </p>
                      <span className="text-[10px] text-outline mt-1 block">
                        {formatTimeAgo(item.timestamp)}
                      </span>
                    </div>
                    {item.isNew && (
                      <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-5 h-5 text-on-surface-variant" />
                </div>
                <p className="text-sm font-medium text-on-surface-variant">No recent activity</p>
                <p className="text-xs text-outline mt-1">
                  Your messages, listing updates, and more will appear here.
                </p>
              </div>
            )}
          </div>

          {/* Performance Card */}
          <div className="bg-surface-container-high rounded-2xl p-8 flex flex-col justify-between overflow-hidden relative">
            <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
            <div>
              <h3 className="text-xl font-display font-bold text-primary mb-8">Performance</h3>
              <div className="space-y-8">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-on-surface-variant mb-1">Profile Views</p>
                    <h4 className="text-3xl font-display font-black text-primary">
                      {totalProfileViews}
                    </h4>
                  </div>
                  {totalProfileViews > 0 && (
                    <div className="text-secondary flex items-center text-xs font-bold mb-1">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Active
                    </div>
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-on-surface-variant mb-1">Matches</p>
                    <h4 className="text-3xl font-display font-black text-primary">
                      {conversationsCount}
                    </h4>
                  </div>
                  {conversationsCount > 0 && (
                    <div className="text-secondary flex items-center text-xs font-bold mb-1">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      +{conversationsCount}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {listingsCount > 0 && (
              <div className="mt-12 bg-surface-container-lowest/40 backdrop-blur-md rounded-2xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-2 text-center">
                  Your Listing Status
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  <span className="text-xs font-bold text-primary">
                    {listingsCount} active listing{listingsCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </AnimatedPage>
  )
}
