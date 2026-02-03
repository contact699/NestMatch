'use client'

import { useState } from 'react'
import Link from 'next/link'
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
      console.error('Error responding to invitation:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'forming':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
            Forming
          </span>
        )
      case 'searching':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">
            Searching
          </span>
        )
      case 'matched':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
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
          <h1 className="text-2xl font-bold text-gray-900">Co-Renter Groups</h1>
          <p className="text-gray-600">Find roommates and search together</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            Pending Invitations ({invitations.length})
          </h2>
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <Card key={invitation.id} variant="bordered" className="border-blue-200 bg-blue-50">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {invitation.inviter.name} invited you to join
                      </p>
                      <p className="text-lg font-semibold text-blue-600">
                        {invitation.group.name}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
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
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : groups.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No groups yet
            </h3>
            <p className="text-gray-500 mb-4">
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
              <Card variant="bordered" className="hover:border-blue-200 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{group.name}</h3>
                        {group.user_role === 'admin' && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                        {getStatusBadge(group.status)}
                      </div>

                      {group.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {group.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
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
                            className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center -ml-2 first:ml-0"
                            style={{ zIndex: 5 - idx }}
                          >
                            {member.user.profile_photo ? (
                              <img
                                src={member.user.profile_photo}
                                alt={member.user.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-medium text-blue-600">
                                {member.user.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        ))}
                        {group.member_count > 5 && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center -ml-2">
                            <span className="text-xs font-medium text-gray-600">
                              +{group.member_count - 5}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>

                  {group.pending_invitations > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-sm text-blue-600">
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
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-1">About Co-Renter Groups</h4>
        <p className="text-sm text-blue-700">
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Group name is required')
      return
    }

    // Client-side budget validation
    const minBudget = budgetMin ? parseFloat(budgetMin) : null
    const maxBudget = budgetMax ? parseFloat(budgetMax) : null
    if (minBudget && maxBudget && minBudget > maxBudget) {
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
          combined_budget_min: minBudget || undefined,
          combined_budget_max: maxBudget || undefined,
          target_move_date: moveDate || undefined,
          preferred_cities: cities
            ? cities.split(',').map((c) => c.trim()).filter(Boolean)
            : undefined,
          budget_contribution: myBudget ? parseFloat(myBudget) : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Handle both string and object error formats
        const errorMessage = typeof data.error === 'string'
          ? data.error
          : data.error?.message || 'Failed to create group'
        throw new Error(errorMessage)
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Toronto Apartment Hunt 2024"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={255}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you looking for? What's your ideal situation?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget Min (CAD)
              </label>
              <input
                type="number"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                placeholder="1000"
                min="0"
                step="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget Max (CAD)
              </label>
              <input
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="2500"
                min="0"
                step="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Budget Contribution (CAD)
            </label>
            <input
              type="number"
              value={myBudget}
              onChange={(e) => setMyBudget(e.target.value)}
              placeholder="Your monthly contribution"
              min="0"
              step="50"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">How much can you contribute monthly to the group's combined budget?</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Move Date
            </label>
            <input
              type="date"
              value={moveDate}
              onChange={(e) => setMoveDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Cities
            </label>
            <input
              type="text"
              value={cities}
              onChange={(e) => setCities(e.target.value)}
              placeholder="Toronto, Vancouver, Montreal"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Separate cities with commas</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
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
