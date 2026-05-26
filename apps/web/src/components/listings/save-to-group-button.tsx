'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
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

interface ActiveGroupRpcRow {
  group_id: string | null
  group_name: string | null
}

interface GroupSavedListingRow {
  id: string
  group_id: string
}

interface GroupSavedListingsClient {
  rpc(fn: 'get_my_active_groups'): Promise<{ data: ActiveGroupRpcRow[] | null }>
  from(table: 'group_saved_listings'): {
    select(columns: 'id, group_id'): {
      eq(column: 'listing_id', value: string): {
        in(column: 'group_id', values: string[]): Promise<{ data: GroupSavedListingRow[] | null }>
      }
    }
    delete(): {
      eq(column: 'id', value: string): Promise<unknown>
    }
    insert(values: { group_id: string; listing_id: string; saved_by: string }): {
      select(columns: 'id'): {
        single(): Promise<{ data: { id: string } | null }>
      }
    }
  }
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
  const buttonRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  // Position the floating menu using fixed coords from the button rect.
  // The action card lives inside `.feature-card { overflow: hidden }`, so the
  // old absolutely-positioned menu was clipped — z-index couldn't escape it.
  // Portaling to <body> with fixed positioning sidesteps the overflow boundary.
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const el = buttonRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const menuWidth = 288 // w-72
      // Anchor right-edge of menu to right-edge of button so it reads as a
      // button-attached dropdown rather than a free-floating popover.
      const left = Math.max(8, rect.right - menuWidth)
      const top = rect.bottom + 8
      setCoords({ top, left, width: menuWidth })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (buttonRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

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
      const groupClient = supabase as unknown as GroupSavedListingsClient
      const { data: rpcRows } = await groupClient.rpc('get_my_active_groups')
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
      const { data: savedRows } = await groupClient
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
      const groupClient = supabase as unknown as GroupSavedListingsClient
      await groupClient
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
      const groupClient = supabase as unknown as GroupSavedListingsClient
      const { data: inserted } = await groupClient
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

  if (!isLoggedIn) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => router.push(`/login?redirect=/listings/${listingId}`)}
      >
        <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-secondary-container text-secondary mr-2.5">
          <UsersRound className="h-4 w-4" />
        </span>
        Save to a group
      </Button>
    )
  }

  const menu = open && coords ? (
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        width: coords.width,
        zIndex: 1000,
      }}
      className="rounded-xl bg-surface-container-lowest ghost-border shadow-lg p-2"
    >
      {loading || groups === null ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-on-surface-variant" />
        </div>
      ) : groups.length === 0 ? (
        <div className="px-3 py-4 text-center">
          <p className="text-sm text-on-surface-variant mb-2">
            You&apos;re not in any co-renter groups yet.
          </p>
          <Link
            href="/groups"
            className="text-sm font-semibold text-secondary hover:underline"
          >
            Create or join a group →
          </Link>
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
  ) : null

  return (
    <div ref={buttonRef}>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-secondary-container text-secondary mr-2.5">
          <UsersRound className="h-4 w-4" />
        </span>
        Save to a group
      </Button>

      {menu && typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
    </div>
  )
}
