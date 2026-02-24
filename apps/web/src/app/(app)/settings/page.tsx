'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  User,
  Shield,
  Bell,
  Lock,
  Trash2,
  LogOut,
  ChevronRight,
  Loader2,
  Users,
  AlertCircle,
} from 'lucide-react'

interface BlockedUser {
  id: string
  blocked_user_id: string
  created_at: string
  profile: {
    user_id: string
    name: string | null
    profile_photo: string | null
  } | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [isUnblocking, setIsUnblocking] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/settings')
        return
      }

      // Load blocked users
      const response = await fetch('/api/blocked-users')
      const data = await response.json()

      if (response.ok) {
        setBlockedUsers(data.blocked_users)
      }

      setIsLoading(false)
    }

    loadSettings()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const handleUnblock = async (userId: string) => {
    setIsUnblocking(userId)

    const response = await fetch(`/api/blocked-users/${userId}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      setBlockedUsers((prev) => prev.filter((b) => b.blocked_user_id !== userId))
      toast.success('User unblocked')
    } else {
      toast.error('Failed to unblock user')
    }

    setIsUnblocking(null)
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)

    // Note: Account deletion would typically involve:
    // 1. Soft delete or anonymize user data
    // 2. Cancel any active listings
    // 3. Close conversations
    // 4. Delete auth user

    // For MVP, we'll just show a message
    // In production, implement proper account deletion

    setTimeout(() => {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      toast.info('Account deletion is not yet implemented. Please contact support.')
    }, 1000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account preferences</p>
      </div>

      <div className="space-y-6">
        {/* Account Settings */}
        <Card variant="bordered">
          <CardHeader className="py-4">
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="py-0">
            <Link href="/profile/edit">
              <div className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 -mx-6 px-6 transition-colors">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Edit Profile</p>
                    <p className="text-sm text-gray-500">Update your personal information</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>

            <Link href="/verify">
              <div className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 -mx-6 px-6 transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Verification</p>
                    <p className="text-sm text-gray-500">Verify your identity and build trust</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>

            <Link href="/quiz">
              <div className="flex items-center justify-between py-4 hover:bg-gray-50 -mx-6 px-6 transition-colors">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Lifestyle Quiz</p>
                    <p className="text-sm text-gray-500">Update your compatibility preferences</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Blocked Users */}
        <Card variant="bordered">
          <CardHeader className="py-4">
            <CardTitle className="text-base">Blocked Users</CardTitle>
            <CardDescription>
              Users you've blocked cannot message you or see your listings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {blockedUsers.length === 0 ? (
              <p className="text-sm text-gray-500">You haven't blocked anyone</p>
            ) : (
              <div className="space-y-3">
                {blockedUsers.map((blocked) => (
                  <div
                    key={blocked.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                        {blocked.profile?.profile_photo ? (
                          <img
                            src={blocked.profile.profile_photo}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <span className="font-medium text-gray-900">
                        {blocked.profile?.name || 'Unknown User'}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnblock(blocked.blocked_user_id)}
                      disabled={isUnblocking === blocked.blocked_user_id}
                    >
                      {isUnblocking === blocked.blocked_user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Unblock'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications - Placeholder for future */}
        <Card variant="bordered">
          <CardHeader className="py-4">
            <CardTitle className="text-base">Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Email notifications</p>
                  <p className="text-sm text-gray-500">Receive updates via email</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">New message alerts</p>
                  <p className="text-sm text-gray-500">Get notified of new messages</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card variant="bordered" className="border-red-200">
          <CardHeader className="py-4">
            <CardTitle className="text-base text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Sign out</p>
                <p className="text-sm text-gray-500">Sign out of your account</p>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Delete account</p>
                  <p className="text-sm text-gray-500">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Delete Account?</h3>
            </div>
            <p className="text-gray-600 mb-4">
              This will permanently delete your account, listings, messages, and all associated data. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Account'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
