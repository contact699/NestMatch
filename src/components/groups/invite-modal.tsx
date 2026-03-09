'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Modal, ModalHeader, ModalTitle, ModalContent } from '@/components/ui/modal'
import { Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'

interface SearchResult {
  user_id: string
  name: string
  profile_photo: string | null
  city: string | null
  province: string | null
  verification_level: 'basic' | 'verified' | 'trusted'
}

interface InviteModalProps {
  groupId: string
  isOpen?: boolean
  onClose: () => void
  onSuccess: () => void
}

export function InviteModal({ groupId, isOpen = true, onClose, onSuccess }: InviteModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      toast.error('Please enter at least 2 characters to search')
      return
    }

    setLoading(true)
    setHasSearched(true)

    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to search users')
      }

      setSearchResults(data.users || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to search for users')
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  const handleInvite = async (user: SearchResult) => {
    setInviting(user.user_id)

    try {
      const res = await fetch(`/api/groups/${groupId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitee_id: user.user_id }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      toast.success(`Invitation sent to ${user.name}`)
      // Remove invited user from results
      setSearchResults((prev) => prev.filter((u) => u.user_id !== user.user_id))
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setInviting(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatLocation = (city: string | null, province: string | null) => {
    if (city && province) return `${city}, ${province}`
    return city || province || null
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" ariaLabelledBy="invite-modal-title">
      <ModalHeader onClose={onClose}>
        <ModalTitle id="invite-modal-title">Invite to Group</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search by name or city
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter name or city (min 2 characters)"
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

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {user.profile_photo ? (
                      <img
                        src={user.profile_photo}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-blue-600">
                          {getInitials(user.name)}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{user.name}</div>
                      {formatLocation(user.city, user.province) && (
                        <div className="text-xs text-gray-500 truncate">
                          {formatLocation(user.city, user.province)}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleInvite(user)}
                    disabled={inviting === user.user_id}
                    className="flex-shrink-0 ml-2"
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

          {hasSearched && !loading && searchResults.length === 0 && (
            <div className="p-3 bg-gray-50 text-gray-500 rounded-lg text-sm text-center">
              No users found. Try a different search term.
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
                  toast.success('Link copied to clipboard')
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
      </ModalContent>
    </Modal>
  )
}
