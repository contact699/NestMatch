'use client'

import { useState, useEffect, use, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { clientLogger } from '@/lib/client-logger'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AnimatedPage } from '@/components/ui/animated-page'
import { ConfirmModal } from '@/components/ui/modal'
import { InviteModal } from '@/components/groups/invite-modal'
import { GroupSavedListings } from '@/components/groups/group-saved-listings'
import { GroupChat } from '@/components/groups/group-chat'
import { formatPrice, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Users,
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
  MessageCircle,
  Check,
  MapPin,
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

interface JoinRequest {
  id: string
  user_id: string
  message: string | null
  status: string
  created_at: string
  requester: {
    user_id: string
    name: string | null
    profile_photo: string | null
  } | null
}

// Minimal public-group info shown to a non-member so they can request to join.
interface PublicPreview {
  id: string
  name: string
  description: string | null
  combined_budget_min: number | null
  combined_budget_max: number | null
  target_move_date: string | null
  preferred_cities: string[] | null
  member_count: number
}

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  // Join-request state (admin review + non-member request-to-join)
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [publicPreview, setPublicPreview] = useState<PublicPreview | null>(null)
  const [joinStatus, setJoinStatus] = useState<'none' | 'pending' | 'accepted' | 'declined'>('none')
  const [joinMessage, setJoinMessage] = useState('')
  const [submittingJoin, setSubmittingJoin] = useState(false)
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

  // Admins see and act on pending join requests.
  useEffect(() => {
    if (group?.is_admin) {
      fetchJoinRequests()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.is_admin])

  const fetchGroup = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/groups/${id}`)
      const data = await res.json()

      if (res.ok) {
        setGroup(data.group)
      } else if (res.status === 404 || res.status === 403) {
        // Not a member — if this is a public group, show a request-to-join
        // preview instead of bouncing the user back to the groups list.
        await loadPublicPreview()
      }
    } catch (error) {
      clientLogger.error('Error fetching group', error)
    } finally {
      setLoading(false)
    }
  }

  // Load a limited public preview for a non-member of a public group, plus any
  // existing join-request status for the current user.
  const loadPublicPreview = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { data: g } = await supabase
        .from('co_renter_groups')
        .select('id, name, description, combined_budget_min, combined_budget_max, target_move_date, preferred_cities, is_public, members:co_renter_members(id)')
        .eq('id', id)
        .eq('is_public', true)
        .maybeSingle()

      if (!g) {
        router.push('/groups')
        return
      }

      setPublicPreview({
        id: g.id,
        name: g.name,
        description: g.description,
        combined_budget_min: g.combined_budget_min,
        combined_budget_max: g.combined_budget_max,
        target_move_date: g.target_move_date,
        preferred_cities: g.preferred_cities,
        member_count: Array.isArray(g.members) ? g.members.length : 0,
      })

      if (user) {
        const { data: existing } = await supabase
          .from('co_renter_join_requests')
          .select('status')
          .eq('group_id', id)
          .eq('user_id', user.id)
          .maybeSingle()
        if (existing?.status) {
          setJoinStatus(existing.status as 'pending' | 'accepted' | 'declined')
        }
      }
    } catch (error) {
      clientLogger.error('Error loading public group preview', error)
      router.push('/groups')
    }
  }

  const fetchJoinRequests = async () => {
    try {
      const res = await fetch(`/api/groups/${id}/join-requests`)
      if (res.ok) {
        const data = await res.json()
        setJoinRequests(data.join_requests ?? [])
      }
    } catch (error) {
      clientLogger.error('Error fetching join requests', error)
    }
  }

  const handleRequestToJoin = async () => {
    setSubmittingJoin(true)
    try {
      const res = await fetch(`/api/groups/${id}/join-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: joinMessage.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setJoinStatus('pending')
        toast.success('Request sent! The group admins will review it.')
      } else {
        toast.error(typeof data?.error === 'string' ? data.error : 'Failed to send request')
      }
    } catch (error) {
      clientLogger.error('Error requesting to join group', error)
      toast.error('Failed to send request')
    } finally {
      setSubmittingJoin(false)
    }
  }

  const handleRespondJoinRequest = async (requestId: string, response: 'accepted' | 'declined') => {
    try {
      const res = await fetch(`/api/groups/${id}/join-requests`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, response }),
      })
      if (res.ok) {
        toast.success(response === 'accepted' ? 'Member added to the group' : 'Request declined')
        fetchJoinRequests()
        if (response === 'accepted') fetchGroup()
      } else {
        toast.error('Failed to respond to request')
      }
    } catch (error) {
      clientLogger.error('Error responding to join request', error)
      toast.error('Failed to respond to request')
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

  // Non-member viewing a public group: show a request-to-join preview.
  if (!group && publicPreview) {
    const primaryCity = publicPreview.preferred_cities?.[0] || null
    return (
      <AnimatedPage>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <nav className="flex items-center gap-x-6 mb-8 text-sm font-medium">
            <Link href="/groups" className="text-on-surface-variant hover:text-on-surface transition-colors">
              My Groups
            </Link>
            <Link href="/discover" className="text-on-surface-variant hover:text-on-surface transition-colors">
              Discover
            </Link>
          </nav>

          <Card variant="bordered" className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Public Group
              </span>
            </div>
            <h1 className="font-display text-3xl font-extrabold text-on-surface tracking-tight mb-3">
              {publicPreview.name}
            </h1>
            {publicPreview.description && (
              <p className="text-on-surface-variant mb-4 leading-relaxed">
                {publicPreview.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant mb-6">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {publicPreview.member_count} {publicPreview.member_count === 1 ? 'member' : 'members'}
              </span>
              {(publicPreview.combined_budget_min || publicPreview.combined_budget_max) && (
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" />
                  {publicPreview.combined_budget_min && publicPreview.combined_budget_max
                    ? `${formatPrice(publicPreview.combined_budget_min)} - ${formatPrice(publicPreview.combined_budget_max)}`
                    : publicPreview.combined_budget_max
                      ? `Up to ${formatPrice(publicPreview.combined_budget_max)}`
                      : `From ${formatPrice(publicPreview.combined_budget_min!)}`}
                </span>
              )}
              {publicPreview.target_move_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Move: {formatDate(publicPreview.target_move_date)}
                </span>
              )}
              {primaryCity && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {publicPreview.preferred_cities!.slice(0, 2).join(', ')}
                </span>
              )}
            </div>

            {joinStatus === 'pending' ? (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-tertiary-fixed/30 text-on-surface">
                <Clock className="h-5 w-5 text-on-surface-variant" />
                <span className="text-sm font-medium">
                  Your request is pending. The group admins will review it soon.
                </span>
              </div>
            ) : joinStatus === 'declined' ? (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-error-container text-error">
                <X className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Your request to join this group was declined.
                </span>
              </div>
            ) : joinStatus === 'accepted' ? (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-secondary-container text-secondary">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  You&apos;ve been accepted! Refresh to open the group.
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-on-surface-variant">
                  Add a message (optional)
                </label>
                <textarea
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  placeholder="Introduce yourself to the group admins..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 ghost-border rounded-lg text-sm text-on-surface bg-surface-container-lowest resize-none focus:outline-none focus:ring-2 focus:ring-secondary"
                />
                <Button onClick={handleRequestToJoin} isLoading={submittingJoin} className="w-full sm:w-auto">
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Request to Join
                </Button>
              </div>
            )}
          </Card>
        </div>
      </AnimatedPage>
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
    <AnimatedPage>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Contextual Nav. The "Chat" anchor is styled as a pill so testers
          stop asking "is there a group chat?" — the answer is right at the
          top of the page, visually distinct from the plain text links. */}
      <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-8 text-sm font-medium">
        <Link href="/groups" className="text-on-surface-variant hover:text-on-surface transition-colors pb-1">
          My Groups
        </Link>
        <span className="text-on-surface border-b-2 border-primary pb-1">
          This Group
        </span>
        <a
          href="#group-chat"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-secondary hover:bg-secondary hover:text-on-secondary transition-colors"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Chat
        </a>
        <Link href="/expenses" className="text-on-surface-variant hover:text-on-surface transition-colors pb-1">
          Expenses
        </Link>
        <Link href="/resources/agreement" className="text-on-surface-variant hover:text-on-surface transition-colors pb-1">
          Agreement
        </Link>
        <Link href="/payments" className="text-on-surface-variant hover:text-on-surface transition-colors pb-1">
          Payments
        </Link>
      </nav>

      {/* Est. Date */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm text-on-surface-variant">Est. {estDate}</span>
      </div>

      {/* Group Name */}
      <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-on-surface tracking-tight mb-3">
        {group.name}
      </h1>

      {/* Mission quote + action buttons. The "Open Chat" CTA is the primary
          action so testers stop asking "is there a group chat?" — it scrolls
          to the chat block further down the page. */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
        {group.description && (
          <p className="text-on-surface-variant italic max-w-2xl text-base leading-relaxed">
            &ldquo;{group.description}&rdquo;
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
          <Button
            size="sm"
            onClick={() => {
              document
                .getElementById('group-chat')
                ?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            <MessageCircle className="h-4 w-4 mr-1.5" />
            Open Chat
          </Button>
          {group.is_admin && (
            <Button variant="outline" size="sm" onClick={() => setShowSettingsModal(true)}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit Mission
            </Button>
          )}
          {group.is_admin && (
            <Button variant="outline" size="sm" onClick={() => setShowInviteModal(true)}>
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

      {/* Join Requests — admins review people who asked to join a public group */}
      {group.is_admin && (
        <Card variant="bordered" className="mb-10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-xl font-bold">Join Requests</CardTitle>
            {joinRequests.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-fixed text-primary">
                {joinRequests.length} pending
              </span>
            )}
          </CardHeader>
          <CardContent>
            {joinRequests.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-2">
                No pending requests. When someone asks to join this public group, they&apos;ll appear here.
              </p>
            ) : (
              <div className="space-y-4">
                {joinRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 ghost-border rounded-lg"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {request.requester?.profile_photo ? (
                        <img
                          src={request.requester.profile_photo}
                          alt={request.requester.name || 'User'}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-primary-fixed rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {(request.requester?.name || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-on-surface">
                          {request.requester?.name || 'Someone'}
                        </p>
                        {request.message && (
                          <p className="text-sm text-on-surface-variant mt-0.5 break-words">
                            &ldquo;{request.message}&rdquo;
                          </p>
                        )}
                        <p className="text-xs text-on-surface-variant/70 mt-1">
                          Requested {formatDate(request.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRespondJoinRequest(request.id, 'declined')}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRespondJoinRequest(request.id, 'accepted')}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Group chat — real-time messaging between active members */}
      <div id="group-chat" className="mb-10 scroll-mt-24">
        <GroupChat groupId={id} />
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
    </AnimatedPage>
  )
}
