import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VerificationBadge } from '@/components/ui/badge'
import { AnimatedPage } from '@/components/ui/animated-page'
import {
  PlusCircle,
  Search,
  MessageCircle,
  User,
  ClipboardList,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Home,
  Heart,
} from 'lucide-react'

type ProfileData = {
  name: string | null
  bio: string | null
  verification_level: 'basic' | 'verified' | 'trusted'
  profile_photo: string | null
}

export const metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, bio, verification_level, profile_photo')
    .eq('user_id', user.id)
    .single() as { data: ProfileData | null }

  // Fetch lifestyle responses
  const { data: lifestyleResponses } = await supabase
    .from('lifestyle_responses')
    .select('id')
    .eq('user_id', user.id)
    .single() as { data: { id: string } | null }

  // Batch fetch: all counts in parallel
  const [listingsResult, unreadResult, savedResult] = await Promise.all([
    supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null)
      .neq('sender_id', user.id),
    supabase
      .from('saved_listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  const listingsCount = listingsResult.count
  const unreadCount = unreadResult.count
  const savedCount = savedResult.count

  const hasCompletedProfile = profile?.name && profile?.bio
  const hasCompletedQuiz = !!lifestyleResponses
  const isVerified = profile?.verification_level !== 'basic'

  const completionSteps = [
    {
      title: 'Complete your profile',
      description: 'Add your name, bio, and photo',
      completed: hasCompletedProfile,
      href: '/profile/edit',
    },
    {
      title: 'Take the lifestyle quiz',
      description: 'Help us find compatible roommates',
      completed: hasCompletedQuiz,
      href: '/quiz',
    },
    {
      title: 'Verify your identity',
      description: 'Build trust with verified status',
      completed: isVerified,
      href: '/verify',
    },
  ]

  const completedSteps = completionSteps.filter((s) => s.completed).length
  const progressPercentage = (completedSteps / completionSteps.length) * 100

  return (
    <AnimatedPage>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8" data-animate>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here&apos;s what&apos;s happening with your NestMatch account.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Completion Card */}
            {progressPercentage < 100 && (
              <Card variant="bordered" data-animate className="delay-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-blue-600" />
                    Complete your profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Profile completion</span>
                      <span className="font-medium">{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {completionSteps.map((step) => (
                      <li key={step.title}>
                        <Link
                          href={step.href}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-all duration-300 hover:translate-x-1"
                        >
                          {step.completed ? (
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-medium ${
                                step.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                              }`}
                            >
                              {step.title}
                            </p>
                            <p className="text-sm text-gray-500">{step.description}</p>
                          </div>
                          {!step.completed && (
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div data-animate className="delay-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick actions</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link href="/listings/new" data-animate className="delay-200">
                  <Card variant="feature" animate className="h-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                          <PlusCircle className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Post a room</p>
                          <p className="text-sm text-gray-500">List your space</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/search" data-animate className="delay-300">
                  <Card variant="feature" animate className="h-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                          <Search className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Find a room</p>
                          <p className="text-sm text-gray-500">Browse listings</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/my-listings" data-animate className="delay-400">
                  <Card variant="feature" animate className="h-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                          <Home className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">My listings</p>
                          <p className="text-sm text-gray-500">
                            {listingsCount && listingsCount > 0
                              ? `${listingsCount} active`
                              : 'Manage your rooms'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/messages" data-animate className="delay-500">
                  <Card variant="feature" animate className="h-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center relative">
                          <MessageCircle className="h-6 w-6 text-orange-600" />
                          {unreadCount && unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Messages</p>
                          <p className="text-sm text-gray-500">
                            {unreadCount && unreadCount > 0
                              ? `${unreadCount} unread`
                              : 'View conversations'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/saved" data-animate className="delay-600">
                  <Card variant="feature" animate className="h-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                          <Heart className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Saved</p>
                          <p className="text-sm text-gray-500">
                            {savedCount && savedCount > 0
                              ? `${savedCount} saved`
                              : 'Your saved listings'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card variant="bordered" data-animate className="delay-300">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                    {profile?.profile_photo ? (
                      <img
                        src={profile.profile_photo}
                        alt={profile.name || 'Profile'}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-10 w-10 text-blue-600" />
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    {profile?.name || 'Complete your profile'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{user.email}</p>
                  <div className="mt-3">
                    <VerificationBadge level={profile?.verification_level || 'basic'} />
                  </div>
                  <Link href="/profile">
                    <Button variant="glow" size="sm" className="mt-4">
                      View profile
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card variant="bordered" data-animate className="delay-400">
              <CardHeader>
                <CardTitle className="text-base">Your activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Active listings</span>
                    <span className="font-semibold">{listingsCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Unread messages</span>
                    <span className="font-semibold">{unreadCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Saved listings</span>
                    <span className="font-semibold">{savedCount || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AnimatedPage>
  )
}
