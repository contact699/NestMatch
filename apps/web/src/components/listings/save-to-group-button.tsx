'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark, Check, Loader2, UsersRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface SaveToGroupButtonProps {
  listingId: string
  isLoggedIn: boolean
}

interface GroupRow {
  group_id: string
  group_name: string
  /** True iff this listing is already shortlisted for this group */
  alreadySaved: boolean
  /** id of the existing group_saved_listings row, when alreadySaved */
  savedRowId: string | null
}

/**
 * Lets a user shortlist this listing into one or more co-renter groups they
 * belong to. Hidden when the user is in zero groups so it doesn't add noise.
 */
export function SaveToGroupButton({ listingId, isLoggedIn }: SaveToGroupButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [togglingGroupId, setTogglingGroupId] = useState<string | null>(null)
  const [groups, setGroups] = useState<GroupRow[] | null>(null)

  // Lazy-load groups + saved-state when the dropdown opens for the first time.
  useEffect(() => {
    if (!open || groups !== null || !isLoggedIn) return

    let cancelled = false
    ;(async () => {
      setLoading(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Active group memberships for this user, via SECURITY DEFINER RPC
      // (migration 025). co_renter_members has known RLS recursion issues —
      // querying it directly from the client silently returns zero rows, the
      // same reason /api/groups/* routes hop through a service client.
      const { data: rpcRows } = await (supabase.rpc as any)('get_my_active_groups')
      const rows = ((rpcRows as Array<{ group_id: string; group_name: string }> | null) ?? [])
        .map((m) => ({
          group_id: m.group_id,
          group_name: m.group_name || 'Untitled group',
        }))
        .filter((r) => r.group_id)

      if (rows.length === 0) {
        if (!cancelled) {
          setGroups([])
          setLoading(false)
        }
        return
      }

      // Which of those groups already have this listing shortlisted?
      const groupIds = rows.map((r) => r.group_id)
      const { data: savedRows } = await (supabase as any)
        .from('group_saved_listings')
        .select('id, group_id')
        .eq('listing_id', listingId)
        .in('group_id', groupIds)

      const savedByGroup = new Map<string, string>()
      for (const r of (savedRows as Array<{ id: string; group_id: string }> | null) || []) {
        savedByGroup.set(r.group_id, r.id)
      }

      if (!cancelled) {
        setGroups(
          rows.map((r) => ({
            ...r,
            alreadySaved: savedByGroup.has(r.group_id),
            savedRowId: savedByGroup.get(r.group_id) ?? null,
          }))
        )
        setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, groups, isLoggedIn, listingId])

  const toggleGroup = async (group: GroupRow) => {
    setTogglingGroupId(group.group_id)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setTogglingGroupId(null)
      return
    }

    if (group.alreadySaved && group.savedRowId) {
      await (supabase as any)
        .from('group_saved_listings')
        .delete()
        .eq('id', group.savedRowId)
      setGroups((prev) =>
        (prev ?? []).map((g) =>
          g.group_id === group.group_id
            ? { ...g, alreadySaved: false, savedRowId: null }
            : g
        )
      )
    } else {
      const { data: inserted } = await (supabase as any)
        .from('group_saved_listings')
        .insert({
          group_id: group.group_id,
          listing_id: listingId,
          saved_by: user.id,
        })
        .select('id')
        .single()
      setGroups((prev) =>
        (prev ?? []).map((g) =>
          g.group_id === group.group_id
            ? { ...g, alreadySaved: true, savedRowId: inserted?.id ?? null }
            : g
        )
      )
    }

    setTogglingGroupId(null)
    router.refresh()
  }

  if (!isLoggedIn) return null

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setOpen((v) => !v)}
      >
        <UsersRound className="h-4 w-4 mr-2" />
        Save to a group
      </Button>

      {open && (
        <div
          className="absolute z-20 right-0 mt-2 w-72 rounded-xl bg-surface-container-lowest ghost-border shadow-lg p-2"
          role="menu"
        >
          {loading || groups === null ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-on-surface-variant" />
            </div>
          ) : groups.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-on-surface-variant mb-2">
                You're not in any co-renter groups yet.
              </p>
              <a
                href="/groups"
                className="text-sm font-semibold text-secondary hover:underline"
              >
                Create or join a group →
              </a>
            </div>
          ) : (
            <>
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Save to
              </p>
              <ul className="space-y-1">
                {groups.map((g) => (
                  <li key={g.group_id}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(g)}
                      disabled={togglingGroupId === g.group_id}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-surface-container-low transition-colors text-left disabled:opacity-50"
                    >
                      <span className="truncate">{g.group_name}</span>
                      {togglingGroupId === g.group_id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-on-surface-variant flex-shrink-0" />
                      ) : g.alreadySaved ? (
                        <Check className="h-4 w-4 text-secondary flex-shrink-0" />
                      ) : (
                        <Bookmark className="h-4 w-4 text-on-surface-variant flex-shrink-0" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
