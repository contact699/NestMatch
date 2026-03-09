'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { useFetch } from '@/lib/hooks/use-fetch'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Users,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'

interface GroupData {
  group: {
    id: string
    name: string
    description: string | null
    combined_budget_min: number | null
    combined_budget_max: number | null
    target_move_date: string | null
    preferred_cities: string[] | null
    is_public: boolean
    user_role: string | null
    is_member: boolean
    join_request_status: string | null
    members: {
      id: string
      role: string
      user: {
        user_id: string
        name: string
        profile_photo: string | null
      }
    }[]
  }
}

export default function JoinGroupPage() {
  const params = useParams()
  const groupId = params.id as string
  const router = useRouter()

  const [requestSent, setRequestSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    data,
    isLoading,
    error,
  } = useFetch<GroupData>(`/api/groups/${groupId}`, {
    onSuccess: (result) => {
      // If user is already a member, redirect to the group page
      if (result.group.is_member || result.group.user_role) {
        router.replace(`/groups/${groupId}`)
      }
    },
  })

  const group = data?.group

  const handleJoinRequest = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/join-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`)
      }

      setRequestSent(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send join request')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-500">Loading group details...</p>
        </div>
      </div>
    )
  }

  // Error state (group not found or private)
  if (error || !group) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card variant="bordered">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Group not found
            </h2>
            <p className="text-gray-500 mb-6">
              {error || 'This group does not exist or is not accepting join requests.'}
            </p>
            <Link href="/groups">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go back to Groups
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Already has a pending request
  if (group.join_request_status === 'pending') {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card variant="bordered">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Request already pending
            </h2>
            <p className="text-gray-500 mb-6">
              You already have a pending request to join <span className="font-medium">{group.name}</span>.
              The group admin will review your request soon.
            </p>
            <Link href="/groups">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go back to Groups
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Request was declined
  if (group.join_request_status === 'declined') {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card variant="bordered">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Request declined
            </h2>
            <p className="text-gray-500 mb-6">
              Your previous request to join <span className="font-medium">{group.name}</span> was declined.
            </p>
            <Link href="/groups">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go back to Groups
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state (request just sent)
  if (requestSent) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card variant="bordered">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Request sent!
            </h2>
            <p className="text-gray-500 mb-6">
              Your request to join <span className="font-medium">{group.name}</span> has been sent.
              The group admin will review your request and you will be notified of their decision.
            </p>
            <Link href="/groups">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go back to Groups
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Default: show group info and join button
  const memberCount = group.members?.length ?? 0

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Card variant="bordered">
        <CardContent className="py-8">
          {/* Group info */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{group.name}</h1>
            {group.description && (
              <p className="text-gray-600 mb-4">{group.description}</p>
            )}
          </div>

          {/* Group details */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4 text-gray-400" />
              <span>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </span>
            </div>

            {(group.combined_budget_min || group.combined_budget_max) && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span>
                  {group.combined_budget_min && group.combined_budget_max
                    ? `${formatPrice(group.combined_budget_min)} - ${formatPrice(group.combined_budget_max)}`
                    : group.combined_budget_max
                      ? `Up to ${formatPrice(group.combined_budget_max)}`
                      : `From ${formatPrice(group.combined_budget_min!)}`
                  }
                </span>
              </div>
            )}

            {group.target_move_date && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>Move date: {formatDate(group.target_move_date)}</span>
              </div>
            )}

            {group.preferred_cities && group.preferred_cities.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{group.preferred_cities.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Member avatars */}
          {group.members && group.members.length > 0 && (
            <div className="flex items-center justify-center gap-1 mb-8">
              {group.members.slice(0, 5).map((member, idx) => (
                <div
                  key={member.id}
                  className="w-10 h-10 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center -ml-2 first:ml-0"
                  style={{ zIndex: 5 - idx }}
                >
                  {member.user.profile_photo ? (
                    <img
                      src={member.user.profile_photo}
                      alt={member.user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-blue-600">
                      {member.user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              ))}
              {memberCount > 5 && (
                <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center -ml-2">
                  <span className="text-xs font-medium text-gray-600">
                    +{memberCount - 5}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={handleJoinRequest}
              isLoading={submitting}
            >
              <Users className="h-4 w-4 mr-2" />
              Request to Join
            </Button>
            <Link href="/groups" className="block">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go back
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
