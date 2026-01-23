import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VerificationBadge } from '@/components/ui/badge'
import {
  PlusCircle,
  Search,
  MessageCircle,
  User,
  ClipboardList,
  ArrowRight,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

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

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single() as { data: { name: string | null; bio: string | null; verification_level: 'basic' | 'verified' | 'trusted'; profile_photo: string | null } | null }

  // Fetch user's lifestyle responses
  const { data: lifestyleResponses } = await supabase
    .from('lifestyle_responses')
    .select('id')
    .eq('user_id', user.id)
    .single() as { data: { id: string } | null }

  // Fetch user's listings count
  const { count: listingsCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id) as { count: number | null }

  // Fetch unread messages count
  const { count: unreadCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null)
    .neq('sender_id', user.id) as { count: number | null }

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
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
            <Card variant="bordered">
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
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
                <ul className="space-y-3">
                  {completionSteps.map((step) => (
                    <li key={step.title}>
                      <Link
                        href={step.href}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
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
          <Card variant="bordered">
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <Link href="/listings/new">
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <PlusCircle className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Post a room</p>
                      <p className="text-sm text-gray-500">List your space</p>
                    </div>
                  </div>
                </Link>
                <Link href="/search">
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Search className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Find a room</p>
                      <p className="text-sm text-gray-500">Browse listings</p>
                    </div>
                  </div>
                </Link>
                <Link href="/seeking/new">
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <User className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Create seeker profile</p>
                      <p className="text-sm text-gray-500">Let rooms find you</p>
                    </div>
                  </div>
                </Link>
                <Link href="/messages">
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center relative">
                      <MessageCircle className="h-6 w-6 text-orange-600" />
                      {unreadCount && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
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
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card variant="bordered">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
                  <Button variant="outline" size="sm" className="mt-4">
                    View profile
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card variant="bordered">
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
                  <span className="text-gray-600">Profile views</span>
                  <span className="font-semibold text-gray-400">Coming soon</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
