'use client'

import { useState } from 'react'
import Link from 'next/link'
import { clientLogger } from '@/lib/client-logger'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal, ModalHeader, ModalTitle, ModalContent } from '@/components/ui/modal'
import { FetchError } from '@/components/ui/fetch-error'
import { useFetch } from '@/lib/hooks/use-fetch'
import { formatPrice, formatDate } from '@/lib/utils'
import {
  Users,
  Plus,
  MapPin,
  Calendar,
  DollarSign,
  Loader2,
  ChevronRight,
  UserPlus,
  Crown,
  Bell,
  MessageCircle,
} from 'lucide-react'

interface GroupMember {
  id: string
  role: string
  budget_contribution: number | null
  user: {
    user_id: string
    name: string
    profile_photo: string | null
  }
}

interface Group {
  id: string
  name: string
  description: string | null
  combined_budget_min: number | null
  combined_budget_max: number | null
  target_move_date: string | null
  preferred_cities: string[] | null
  status: string
  members: GroupMember[]
  user_role: string
  member_count: number
  pending_invitations: number
}

interface Invitation {
  id: string
  created_at: string
  inviter: {
    user_id: string
    name: string
    profile_photo: string | null
  }
  group: {
    id: string
    name: string
    description: string | null
    combined_budget_min: number | null
    combined_budget_max: number | null
    target_move_date: string | null
    preferred_cities: string[] | null
    members: any[]
  }
}

export default function GroupsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)

  const {
    data: groupsData,
    isLoading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
  } = useFetch<{ groups: Group[] }>('/api/groups')

  const {
    data: unreadData,
  } = useFetch<{ totalUnread: number; byGroup: Record<string, number> }>(
    '/api/groups/unread',
  )

  const {
    data: invitationsData,
    isLoading: invitationsLoading,
    refetch: refetchInvitations,
  } = useFetch<{ invitations: Invitation[] }>('/api/invitations')

  const groups = groupsData?.groups ?? []
  const invitations = invitationsData?.invitations ?? []
  const isLoading = groupsLoading || invitationsLoading

  const handleInvitationResponse = async (groupId: string, invitationId: string, response: 'accept' | 'decline') => {
    try {
      const res = await fetch(`/api/groups/${groupId}/invitations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation_id: invitationId, response }),
      })

      if (res.ok) {
        refetchGroups()
        refetchInvitations()
      }
    } catch (error) {
      clientLogger.error('Error responding to invitation', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'forming':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-primary-fixed text-primary">
            Forming
          </span>
        )
      case 'searching':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-tertiary-fixed text-tertiary-container">
            Searching
          </span>
        )
      case 'matched':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-secondary-container text-secondary">
            Matched
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display text-on-surface">Co-Renter Groups</h1>
          <p className="text-on-surface-variant">Find roommates and search together</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Pending Invitations ({invitations.length})
          </h2>
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <Card key={invitation.id} variant="bordered" className="border-outline-variant/15 bg-primary-fixed">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-on-surface">
                        {invitation.inviter.name} invited you to join
                      </p>
                      <p className="text-lg font-semibold text-primary">
                        {invitation.group.name}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {invitation.group.members?.length || 0} members
                        </span>
                        {invitation.group.preferred_cities?.length && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {invitation.group.preferred_cities.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInvitationResponse(
                          invitation.group.id,
                          invitation.id,
                          'decline'
                        )}
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleInvitationResponse(
                          invitation.group.id,
                          invitation.id,
                          'accept'
                        )}
                      >
                        Accept
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Groups List */}
      {groupsError ? (
        <FetchError message={groupsError} onRetry={refetchGroups} />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : groups.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-outline mx-auto mb-4" />
            <h3 className="text-lg font-medium text-on-surface mb-2">
              No groups yet
            </h3>
            <p className="text-on-surface-variant mb-4">
              Create a group to start searching for housing with others.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card variant="bordered" className="ghost-border hover:border-outline-variant/30 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-on-surface">{group.name}</h3>
                        {group.user_role === 'admin' && (
                          <Crown className="h-4 w-4 text-tertiary-container" />
                        )}
                        {getStatusBadge(group.status)}
                        {(unreadData?.byGroup?.[group.id] ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-on-secondary text-[10px] font-bold">
                            <MessageCircle className="h-3 w-3" />
                            {(unreadData!.byGroup[group.id]) > 9
                              ? '9+'
                              : unreadData!.byGroup[group.id]}
                          </span>
                        )}
                      </div>

                      {group.description && (
                        <p className="text-sm text-on-surface-variant mb-3 line-clamp-2">
                          {group.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                        </span>

                        {(group.combined_budget_min || group.combined_budget_max) && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {group.combined_budget_min && group.combined_budget_max
                              ? `${formatPrice(group.combined_budget_min)} - ${formatPrice(group.combined_budget_max)}`
                              : group.combined_budget_max
                                ? `Up to ${formatPrice(group.combined_budget_max)}`
                                : `From ${formatPrice(group.combined_budget_min!)}`
                            }
                          </span>
                        )}

                        {group.target_move_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Move: {formatDate(group.target_move_date)}
                          </span>
                        )}

                        {group.preferred_cities?.length && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {group.preferred_cities.slice(0, 2).join(', ')}
                            {group.preferred_cities.length > 2 && ` +${group.preferred_cities.length - 2}`}
                          </span>
                        )}
                      </div>

                      {/* Member Avatars */}
                      <div className="flex items-center gap-1 mt-3">
                        {group.members.slice(0, 5).map((member, idx) => (
                          <div
                            key={member.id}
                            className="w-8 h-8 rounded-full bg-primary-fixed border-2 border-surface-container-lowest flex items-center justify-center -ml-2 first:ml-0"
                            style={{ zIndex: 5 - idx }}
                          >
                            {member.user.profile_photo ? (
                              <img
                                src={member.user.profile_photo}
                                alt={member.user.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-medium text-primary">
                                {member.user.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        ))}
                        {group.member_count > 5 && (
                          <div className="w-8 h-8 rounded-full bg-surface-container border-2 border-surface-container-lowest flex items-center justify-center -ml-2">
                            <span className="text-xs font-medium text-on-surface-variant">
                              +{group.member_count - 5}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-outline flex-shrink-0" />
                  </div>

                  {group.pending_invitations > 0 && (
                    <div className="mt-3 pt-3 border-t border-outline-variant/15">
                      <span className="text-sm text-primary">
                        <UserPlus className="h-4 w-4 inline mr-1" />
                        {group.pending_invitations} pending invitation{group.pending_invitations !== 1 && 's'}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            refetchGroups()
          }}
        />
      )}

      {/* Info */}
      <div className="mt-8 p-4 bg-primary-fixed rounded-lg">
        <h4 className="font-medium text-on-surface mb-1">About Co-Renter Groups</h4>
        <p className="text-sm text-on-surface-variant">
          Create or join a group to search for housing together. Combine budgets, share
          preferences, and find the perfect place as a team. Groups can include friends,
          colleagues, or people you've matched with on NestMatch.
        </p>
      </div>
    </div>
  )
}

// Create Group Modal Component
function CreateGroupModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [myBudget, setMyBudget] = useState('')
  const [moveDate, setMoveDate] = useState('')
  const [cities, setCities] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Group name is required')
      return
    }

    const parseOptionalPositive = (value: string): number | undefined => {
      if (!value.trim()) return undefined
      const num = Number(value)
      if (!Number.isFinite(num) || num <= 0) return undefined
      return Math.round(num)
    }

    // Client-side budget validation
    const minBudget = parseOptionalPositive(budgetMin)
    const maxBudget = parseOptionalPositive(budgetMax)
    if (minBudget !== undefined && maxBudget !== undefined && minBudget > maxBudget) {
      setError('Minimum budget cannot exceed maximum budget')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          combined_budget_min: minBudget,
          combined_budget_max: maxBudget,
          target_move_date: moveDate || undefined,
          preferred_cities: cities
            ? cities.split(',').map((c) => c.trim()).filter(Boolean)
            : undefined,
          budget_contribution: parseOptionalPositive(myBudget),
          is_public: isPublic,
        }),
      })

      let data: any
      try {
        data = await res.json()
      } catch {
        if (!res.ok) throw new Error(`Server error (${res.status})`)
      }

      if (!res.ok) {
        // Handle both string and object error formats
        const errorMessage = typeof data?.error === 'string'
          ? data.error
          : data?.error?.message || data?.message || `Failed to create group (${res.status})`
        throw new Error(errorMessage)
      }

      onSuccess()
    } catch (err) {
      clientLogger.error('Create group error', err)
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <ModalTitle>Create Co-Renter Group</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Group Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Toronto Apartment Hunt 2026"
              className="w-full px-3 py-2 border border-outline-variant/15 rounded-lg focus:ring-2 focus:ring-surface-tint/20 focus:border-primary"
              maxLength={255}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you looking for? What's your ideal situation?"
              rows={3}
              className="w-full px-3 py-2 border border-outline-variant/15 rounded-lg focus:ring-2 focus:ring-surface-tint/20 focus:border-primary resize-none"
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">
                Budget Min (CAD)
              </label>
              <input
                type="number"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                placeholder="1000"
                min="1"
                max="99999"
                step="1"
                className="w-full px-3 py-2 border border-outline-variant/15 rounded-lg focus:ring-2 focus:ring-surface-tint/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">
                Budget Max (CAD)
              </label>
              <input
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="2500"
                min="1"
                max="99999"
                step="1"
                className="w-full px-3 py-2 border border-outline-variant/15 rounded-lg focus:ring-2 focus:ring-surface-tint/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Your Budget Contribution (CAD)
            </label>
            <input
              type="number"
              value={myBudget}
              onChange={(e) => setMyBudget(e.target.value)}
              placeholder="Your monthly contribution"
              min="1"
              max="99999"
              step="1"
              className="w-full px-3 py-2 border border-outline-variant/15 rounded-lg focus:ring-2 focus:ring-surface-tint/20 focus:border-primary"
            />
            <p className="text-xs text-on-surface-variant mt-1">How much can you contribute monthly to the group's combined budget?</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Target Move Date
            </label>
            <input
              type="date"
              value={moveDate}
              onChange={(e) => setMoveDate(e.target.value)}
              className="w-full px-3 py-2 border border-outline-variant/15 rounded-lg focus:ring-2 focus:ring-surface-tint/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Preferred Cities
            </label>
            <input
              type="text"
              value={cities}
              onChange={(e) => setCities(e.target.value)}
              placeholder="Toronto, Vancouver, Montreal"
              className="w-full px-3 py-2 border border-outline-variant/15 rounded-lg focus:ring-2 focus:ring-surface-tint/20 focus:border-primary"
            />
            <p className="text-xs text-on-surface-variant mt-1">Separate cities with commas</p>
          </div>

          <label className="flex items-start gap-3 p-3 ghost-border rounded-lg cursor-pointer hover:bg-surface-container-low">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mt-1 rounded border-outline-variant/15 text-primary focus:ring-surface-tint/20"
            />
            <div>
              <p className="text-sm font-medium text-on-surface">
                Make this group discoverable
              </p>
              <p className="text-xs text-on-surface-variant">
                Public groups appear in Discover so compatible users can request to join.
              </p>
            </div>
          </label>

          {error && (
            <div className="p-3 bg-error-container text-error rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" isLoading={loading}>
              Create Group
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  )
}
