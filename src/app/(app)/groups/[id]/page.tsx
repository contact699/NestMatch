'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { clientLogger } from '@/lib/client-logger'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/modal'
import { InviteModal } from '@/components/groups/invite-modal'
import { formatPrice, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Users,
  MapPin,
  Calendar,
  DollarSign,
  Loader2,
  ArrowLeft,
  Crown,
  UserPlus,
  Settings,
  Trash2,
  LogOut,
  Search,
  Clock,
  X,
} from 'lucide-react'

interface GroupMember {
  id: string
  role: string
  budget_contribution: number | null
  joined_at: string
  user: {
    user_id: string
    name: string
    profile_photo: string | null
    email?: string
    bio?: string
  }
}

interface Invitation {
  id: string
  status: string
  created_at: string
  inviter: { name: string }
  invitee: {
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
  created_at: string
  members: GroupMember[]
  invitations: Invitation[]
  user_role: string
  is_admin: boolean
}

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{open: boolean; title: string; message: string; onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}})

  useEffect(() => {
    fetchGroup()
  }, [id])

  const fetchGroup = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/groups/${id}`)
      const data = await res.json()

      if (res.ok) {
        setGroup(data.group)
      } else if (res.status === 404 || res.status === 403) {
        router.push('/groups')
      }
    } catch (error) {
      clientLogger.error('Error fetching group', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveGroup = () => {
    if (!group) return

    const userMember = group.members.find(
      (m) => m.role === group.user_role
    )

    if (!userMember) return

    setConfirmModal({
      open: true,
      title: 'Leave Group',
      message: 'Are you sure you want to leave this group?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/groups/${id}/members`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: userMember.id }),
          })

          if (res.ok) {
            toast.success('You have left the group')
            router.push('/groups')
          } else {
            toast.error('Failed to leave group')
          }
        } catch (error) {
          clientLogger.error('Error leaving group', error)
          toast.error('Failed to leave group')
        }
        setConfirmModal(prev => ({ ...prev, open: false }))
      },
    })
  }

  const handleDeleteGroup = () => {
    setConfirmModal({
      open: true,
      title: 'Delete Group',
      message: 'Are you sure you want to delete this group? This cannot be undone.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/groups/${id}`, {
            method: 'DELETE',
          })

          if (res.ok) {
            toast.success('Group deleted successfully')
            router.push('/groups')
          } else {
            toast.error('Failed to delete group')
          }
        } catch (error) {
          clientLogger.error('Error deleting group', error)
          toast.error('Failed to delete group')
        }
        setConfirmModal(prev => ({ ...prev, open: false }))
      },
    })
  }

  const handleRemoveMember = (memberId: string, memberName: string) => {
    setConfirmModal({
      open: true,
      title: 'Remove Member',
      message: `Remove ${memberName} from the group?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/groups/${id}/members`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: memberId }),
          })

          if (res.ok) {
            toast.success(`${memberName} has been removed`)
            fetchGroup()
          } else {
            toast.error('Failed to remove member')
          }
        } catch (error) {
          clientLogger.error('Error removing member', error)
          toast.error('Failed to remove member')
        }
        setConfirmModal(prev => ({ ...prev, open: false }))
      },
    })
  }

  const handlePromoteMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/groups/${id}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, role: 'admin' }),
      })

      if (res.ok) {
        toast.success('Member promoted to admin')
        fetchGroup()
      } else {
        toast.error('Failed to promote member')
      }
    } catch (error) {
      clientLogger.error('Error promoting member', error)
      toast.error('Failed to promote member')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'forming':
        return (
          <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
            Forming Team
          </span>
        )
      case 'searching':
        return (
          <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
            Actively Searching
          </span>
        )
      case 'matched':
        return (
          <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
            Found a Place
          </span>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!group) {
    return null
  }

  const totalBudget = group.members.reduce(
    (sum, m) => sum + (m.budget_contribution || 0),
    0
  )
  const pendingInvitations = group.invitations.filter(
    (i) => i.status === 'pending'
  )

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        href="/groups"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Groups
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            {getStatusBadge(group.status)}
          </div>
          {group.description && (
            <p className="text-gray-600 max-w-2xl">{group.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {group.is_admin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInviteModal(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettingsModal(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card variant="bordered">
          <CardContent className="py-4 text-center">
            <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{group.members.length}</p>
            <p className="text-sm text-gray-500">Members</p>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent className="py-4 text-center">
            <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {totalBudget > 0 ? formatPrice(totalBudget) : '-'}
            </p>
            <p className="text-sm text-gray-500">Combined Budget</p>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent className="py-4 text-center">
            <Calendar className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {group.target_move_date
                ? formatDate(group.target_move_date)
                : '-'}
            </p>
            <p className="text-sm text-gray-500">Move Date</p>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent className="py-4 text-center">
            <MapPin className="h-6 w-6 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {group.preferred_cities?.length || 0}
            </p>
            <p className="text-sm text-gray-500">Target Cities</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Members */}
        <div className="lg:col-span-2">
          <Card variant="bordered">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Members</CardTitle>
              {group.is_admin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowInviteModal(true)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Invite
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {group.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {member.user.profile_photo ? (
                        <img
                          src={member.user.profile_photo}
                          alt={member.user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {member.user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {member.user.name}
                          </span>
                          {member.role === 'admin' && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        {member.budget_contribution && (
                          <p className="text-sm text-gray-500">
                            Budget: {formatPrice(member.budget_contribution)}
                          </p>
                        )}
                      </div>
                    </div>

                    {group.is_admin && member.role !== 'admin' && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePromoteMember(member.id)}
                        >
                          <Crown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveMember(member.id, member.user.name)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pending Invitations */}
              {pendingInvitations.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Pending Invitations
                  </h4>
                  <div className="space-y-2">
                    {pendingInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm text-gray-700">
                            {invitation.invitee.name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          Invited {formatDate(invitation.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Preferences */}
          {group.preferred_cities && group.preferred_cities.length > 0 && (
            <Card variant="bordered">
              <CardHeader>
                <CardTitle className="text-lg">Preferred Cities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {group.preferred_cities.map((city) => (
                    <span
                      key={city}
                      className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                    >
                      {city}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Budget Range */}
          {(group.combined_budget_min || group.combined_budget_max) && (
            <Card variant="bordered">
              <CardHeader>
                <CardTitle className="text-lg">Budget Range</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-gray-900">
                  {group.combined_budget_min && group.combined_budget_max
                    ? `${formatPrice(group.combined_budget_min)} - ${formatPrice(group.combined_budget_max)}`
                    : group.combined_budget_max
                      ? `Up to ${formatPrice(group.combined_budget_max)}`
                      : `From ${formatPrice(group.combined_budget_min!)}`}
                </p>
                <p className="text-sm text-gray-500">per month, combined</p>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/search?group=${group.id}`} className="block">
                <Button className="w-full" variant="outline">
                  <Search className="h-4 w-4 mr-2" />
                  Search Listings
                </Button>
              </Link>

              <Button
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                variant="outline"
                onClick={handleLeaveGroup}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave Group
              </Button>

              {group.is_admin && (
                <Button
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  variant="outline"
                  onClick={handleDeleteGroup}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          groupId={group.id}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false)
            fetchGroup()
          }}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Confirm"
        variant="danger"
      />
    </div>
  )
}
