'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Search } from 'lucide-react'

interface InviteModalProps {
  groupId: string
  onClose: () => void
  onSuccess: () => void
}

export function InviteModal({ groupId, onClose, onSuccess }: InviteModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)

    try {
      // In a real app, you'd have a user search endpoint
      // For now, we'll show a placeholder
      setSearchResults([])
      setError('User search functionality coming soon. Ask users to share their profile link.')
    } catch (err) {
      setError('Failed to search for users')
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (userId: string) => {
    setInviting(userId)
    setError(null)

    try {
      const res = await fetch(`/api/groups/${groupId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitee_id: userId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setInviting(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <Card variant="bordered" className="relative z-10 w-full max-w-md">
        <CardHeader>
          <CardTitle>Invite to Group</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search by email or name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter email or name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                {error}
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleInvite(user.user_id)}
                      disabled={inviting === user.user_id}
                    >
                      {inviting === user.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Invite'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-3">
                Or share this invite link:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/groups/join/${groupId}`}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/groups/join/${groupId}`
                    )
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
