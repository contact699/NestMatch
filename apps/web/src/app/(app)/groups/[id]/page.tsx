'use client'

import { useState, useEffect, use, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { clientLogger } from '@/lib/client-logger'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/modal'
import { InviteModal } from '@/components/groups/invite-modal'
import { GroupSavedListings } from '@/components/groups/group-saved-listings'
import { formatPrice, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Users,
  MapPin,
  Calendar,
  DollarSign,
  Loader2,
  Crown,
  UserPlus,
  Settings,
  Trash2,
  LogOut,
  Search,
  Clock,
  X,
  CheckCircle,
  Circle,
  Pencil,
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

  // Expense summary state
  const [expenseSummary, setExpenseSummary] = useState<{
    total_spent: number
    user_balance: number
    settled: boolean
    categories: { name: string; amount: number }[]
  } | null>(null)

  // Shared goals state
  const [goals, setGoals] = useState<{ id: string; label: string; completed: boolean }[]>([
    { id: '1', label: 'Finalize Shared Budget', completed: false },
    { id: '2', label: 'Verify Income & Identities', completed: false },
    { id: '3', label: 'Sign Digital Cohabitation Agreement', completed: false },
    { id: '4', label: 'Schedule Viewing', completed: false },
  ])

  useEffect(() => {
    fetchGroup()
    fetchExpenseSummary()
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

  const fetchExpenseSummary = async () => {
    try {
      const res = await fetch(`/api/expenses?group_id=${id}`)
      if (res.ok) {
        const data = await res.json()
        const expenses = data.expenses ?? []
        const totalSpent = expenses.reduce((sum: number, e: { total_amount: number }) => sum + e.total_amount, 0)
        const summary = data.summary ?? {}
        setExpenseSummary({
          total_spent: totalSpent,
          user_balance: (summary.total_owing ?? 0) - (summary.total_owed ?? 0),
          settled: (summary.total_owed ?? 0) === 0 && (summary.total_owing ?? 0) === 0,
          categories: [],
        })
      }
    } catch {
      // expense summary is supplementary
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

  const daysRemaining = useMemo(() => {
    if (!group?.target_move_date) return null
    const target = new Date(group.target_move_date)
    const now = new Date()
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }, [group?.target_move_date])

  const formattedMoveDate = useMemo(() => {
    if (!group?.target_move_date) return null
    const d = new Date(group.target_move_date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }, [group?.target_move_date])

  const estDate = useMemo(() => {
    if (!group?.created_at) return ''
    const d = new Date(group.created_at)
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [group?.created_at])

  const totalBudget = useMemo(() => {
    if (!group) return 0
    return group.members.reduce(
      (sum, m) => sum + (m.budget_contribution || 0),
      0
    )
  }, [group])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    )
  }

  if (!group) {
    return null
  }

  const pendingInvitations = group.invitations.filter(
    (i) => i.status === 'pending'
  )
  const primaryCity = group.preferred_cities?.[0] || null

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Contextual Nav */}
      <nav className="flex items-center gap-8 mb-8 text-sm font-medium">
        <Link href={`/groups/${id}`} className="text-on-surface border-b-2 border-primary pb-1">
          Groups
        </Link>
        <Link href="/expenses" className="text-on-surface-variant hover:text-on-surface transition-colors pb-1">
          Expenses
        </Link>
        <Link href={`/groups/${id}`} className="text-on-surface-variant hover:text-on-surface transition-colors pb-1">
          Agreement
        </Link>
        <Link href="/payments" className="text-on-surface-variant hover:text-on-surface transition-colors pb-1">
          Payments
        </Link>
      </nav>

      {/* Verified Badge + Est. Date */}
      <div className="flex items-center gap-3 mb-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-secondary-container text-secondary uppercase">
          <CheckCircle className="h-3.5 w-3.5" />
          Verified Group
        </span>
        <span className="text-sm text-on-surface-variant">Est. {estDate}</span>
      </div>

      {/* Group Name */}
      <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-on-surface tracking-tight mb-3">
        {group.name}
      </h1>

      {/* Mission quote + action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
        {group.description && (
          <p className="text-on-surface-variant italic max-w-2xl text-base leading-relaxed">
            &ldquo;{group.description}&rdquo;
          </p>
        )}
        <div className="flex items-center gap-3 flex-shrink-0">
          {group.is_admin && (
            <Button variant="outline" size="sm" onClick={() => setShowSettingsModal(true)}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit Mission
            </Button>
          )}
          {group.is_admin && (
            <Button size="sm" onClick={() => setShowInviteModal(true)}>
              <UserPlus className="h-4 w-4 mr-1.5" />
              Invite Member
            </Button>
          )}
        </div>
      </div>

      {/* Three-column info row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Neighborhood Focus */}
        <Card variant="bordered" className="p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            Neighborhood Focus
          </p>
          <h3 className="font-display text-xl font-bold text-on-surface mb-1">
            {primaryCity || 'Not set'}
          </h3>
          {primaryCity && (
            <p className="text-sm text-on-surface-variant mb-3">
              {primaryCity}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <div className="w-8 h-8 bg-secondary-container rounded-full flex items-center justify-center">
              <MapPin className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface">Walk Score: --</p>
              <p className="text-xs text-on-surface-variant">Transit Access</p>
            </div>
          </div>
        </Card>

        {/* Move-in Date - dark card */}
        <Card variant="default" className="bg-primary text-on-primary p-6 rounded-xl relative overflow-hidden">
          <p className="text-xs font-bold uppercase tracking-wider text-on-primary/70 mb-2">
            Move-in Date
          </p>
          <h3 className="font-display text-4xl font-extrabold mb-1">
            {formattedMoveDate || 'TBD'}
          </h3>
          {daysRemaining !== null && (
            <p className="text-sm text-secondary-container font-medium">
              {daysRemaining > 0
                ? `${daysRemaining} days remaining`
                : daysRemaining === 0
                  ? 'Move-in day!'
                  : `${Math.abs(daysRemaining)} days ago`}
            </p>
          )}
          {!group.target_move_date && (
            <p className="text-sm text-on-primary/70">No date set yet</p>
          )}
          <div className="absolute bottom-2 right-2 text-on-primary/20">
            <Calendar className="h-16 w-16" />
          </div>
        </Card>

        {/* Shared Budget */}
        <Card variant="bordered" className="p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            Shared Budget
          </p>
          <h3 className="font-display text-3xl font-extrabold text-on-surface mb-1">
            {totalBudget > 0 ? formatPrice(totalBudget) : '--'}
          </h3>
          <p className="text-sm text-on-surface-variant mb-4">Per Month</p>

          {/* Budget breakdown from member contributions */}
          <div className="space-y-2">
            {group.members.filter(m => m.budget_contribution && m.budget_contribution > 0).map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">{m.user.name}</span>
                <span className="font-medium text-on-surface">{formatPrice(m.budget_contribution!)}</span>
              </div>
            ))}
          </div>

          {totalBudget > 0 && (
            <Link
              href={`/expenses`}
              className="block mt-4 text-center text-sm font-medium text-secondary hover:underline ghost-border rounded-lg py-2"
            >
              View Budget Details
            </Link>
          )}
        </Card>
      </div>

      {/* Members + Goals two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* Group Members */}
        <Card variant="bordered">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-xl font-bold">Group Members</CardTitle>
            <span className="text-sm text-on-surface-variant">
              {group.members.length} / {group.members.length} Full
            </span>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {group.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {member.user.profile_photo ? (
                      <img
                        src={member.user.profile_photo}
                        alt={member.user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-primary-fixed rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {member.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-on-surface">
                        {member.user.name}
                      </span>
                      {member.user.bio && (
                        <p className="text-xs text-on-surface-variant">{member.user.bio}</p>
                      )}
                      {!member.user.bio && member.budget_contribution && (
                        <p className="text-xs text-on-surface-variant">
                          Budget: {formatPrice(member.budget_contribution)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {member.role === 'admin' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-secondary-container text-secondary uppercase tracking-wide">
                        Leader
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-surface-container text-on-surface-variant uppercase tracking-wide">
                        Member
                      </span>
                    )}
                    {group.is_admin && member.role !== 'admin' && (
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handlePromoteMember(member.id)}
                          className="p-1 rounded hover:bg-surface-container-low transition-colors"
                          title="Promote"
                        >
                          <Crown className="h-4 w-4 text-on-surface-variant" />
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member.id, member.user.name)}
                          className="p-1 rounded hover:bg-error-container transition-colors"
                          title="Remove"
                        >
                          <X className="h-4 w-4 text-error" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
              <div className="mt-6 pt-6 ghost-border-t">
                <h4 className="text-sm font-semibold text-on-surface mb-3">
                  Pending Invitations
                </h4>
                <div className="space-y-2">
                  {pendingInvitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 bg-tertiary-fixed/30 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-on-surface-variant" />
                        <span className="text-sm text-on-surface">
                          {invitation.invitee.name}
                        </span>
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        Invited {formatDate(invitation.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shared Goals Checklist */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle className="font-display text-xl font-bold">Shared Goals Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {goals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => {
                    setGoals(prev =>
                      prev.map(g =>
                        g.id === goal.id ? { ...g, completed: !g.completed } : g
                      )
                    )
                  }}
                  className="flex items-center gap-3 w-full text-left group"
                >
                  {goal.completed ? (
                    <CheckCircle className="h-6 w-6 text-secondary flex-shrink-0" />
                  ) : (
                    <Circle className="h-6 w-6 text-on-surface-variant/40 flex-shrink-0 group-hover:text-secondary transition-colors" />
                  )}
                  <span className={`text-sm font-medium ${goal.completed ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                    {goal.label}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saved Listings — places the group is collectively shortlisting */}
      <div className="mb-10">
        <GroupSavedListings groupId={id} isCurrentUserAdmin={group.is_admin} />
      </div>

      {/* Expense Summary */}
      <Card variant="bordered" className="mb-10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-xl font-bold">Expense Summary</CardTitle>
          <span className="text-sm text-on-surface-variant">
            {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} cycle
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Total Group Spend */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                Total Group Spend
              </p>
              <p className="font-display text-3xl font-extrabold text-on-surface mb-2">
                {formatPrice(expenseSummary?.total_spent ?? 0)}
              </p>
              <Link
                href="/expenses"
                className="text-sm font-medium text-secondary hover:underline"
              >
                DETAILS
              </Link>
            </div>

            {/* My Balance */}
            <div className="bg-surface-container-low rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                My Balance
              </p>
              <div className="flex items-center justify-between">
                <p className="font-display text-3xl font-extrabold text-on-surface">
                  {formatPrice(Math.abs(expenseSummary?.user_balance ?? 0))}
                </p>
                {expenseSummary?.settled ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-secondary-container text-secondary uppercase">
                    Settled
                  </span>
                ) : (expenseSummary?.user_balance ?? 0) > 0 ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-secondary-container text-secondary uppercase">
                    To Receive
                  </span>
                ) : (expenseSummary?.user_balance ?? 0) < 0 ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-error-container text-error uppercase">
                    You Owe
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href={`/search?group=${group.id}`}>
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-1.5" />
            Search Listings
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          className="text-error hover:bg-error-container"
          onClick={handleLeaveGroup}
        >
          <LogOut className="h-4 w-4 mr-1.5" />
          Leave Group
        </Button>
        {group.is_admin && (
          <Button
            variant="outline"
            size="sm"
            className="text-error hover:bg-error-container"
            onClick={handleDeleteGroup}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete Group
          </Button>
        )}
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
