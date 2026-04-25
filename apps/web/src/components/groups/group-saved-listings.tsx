'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, Loader2, MapPin, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'

interface GroupSavedListingsProps {
  groupId: string
  /** Whether the current viewer is an admin of this group. Admins can remove
   *  any saved listing, not just their own (matches the DELETE policy in
   *  migration 025). */
  isCurrentUserAdmin?: boolean
}

interface Row {
  saved_id: string
  saved_by: string
  listing_id: string
  title: string
  city: string | null
  province: string | null
  price: number | null
  photos: string[] | null
  saved_by_name: string | null
}

export function GroupSavedListings({
  groupId,
  isCurrentUserAdmin = false,
}: GroupSavedListingsProps) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

      const { data: saved } = await (supabase as any)
        .from('group_saved_listings')
        .select('id, saved_by, listing_id, created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      const savedRows = (saved as Array<{
        id: string
        saved_by: string
        listing_id: string
      }> | null) || []

      if (savedRows.length === 0) {
        if (!cancelled) setRows([])
        return
      }

      const listingIds = savedRows.map((r) => r.listing_id)
      const saverIds = [...new Set(savedRows.map((r) => r.saved_by))]

      const [listingsRes, profilesRes] = await Promise.all([
        supabase
          .from('listings')
          .select('id, title, city, province, price, photos')
          .in('id', listingIds),
        supabase
          .from('profiles')
          .select('user_id, name')
          .in('user_id', saverIds),
      ])
      const listings = (listingsRes.data ?? []) as any[]
      const profiles = (profilesRes.data ?? []) as any[]

      const listingById = new Map((listings ?? []).map((l) => [l.id, l]))
      const nameByUser = new Map(
        (profiles ?? []).map((p) => [p.user_id, (p.name as string) ?? null])
      )

      const merged: Row[] = savedRows
        .map((r) => {
          const listing = listingById.get(r.listing_id)
          if (!listing) return null
          return {
            saved_id: r.id,
            saved_by: r.saved_by,
            listing_id: r.listing_id,
            title: listing.title,
            city: listing.city ?? null,
            province: listing.province ?? null,
            price: listing.price ?? null,
            photos: listing.photos ?? null,
            saved_by_name: nameByUser.get(r.saved_by) ?? null,
          }
        })
        .filter((x): x is Row => x !== null)

      if (!cancelled) setRows(merged)
    })()

    return () => {
      cancelled = true
    }
  }, [groupId])

  const handleRemove = async (savedId: string) => {
    setRemovingId(savedId)
    const supabase = createClient()
    await (supabase as any).from('group_saved_listings').delete().eq('id', savedId)
    setRows((prev) => (prev ?? []).filter((r) => r.saved_id !== savedId))
    setRemovingId(null)
  }

  if (rows === null) {
    return (
      <Card variant="bordered">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-on-surface-variant" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="bordered">
      <CardContent className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-on-surface flex items-center gap-2">
            <Heart className="h-5 w-5 text-secondary" />
            Saved Listings
          </h3>
          <span className="text-xs text-on-surface-variant">
            {rows.length} {rows.length === 1 ? 'listing' : 'listings'}
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            No listings saved yet. From any listing's detail page, use the
            &ldquo;Save to a group&rdquo; button to shortlist it here.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => {
              // Mirrors the DELETE policy: saver OR group admin.
              const canRemove = r.saved_by === currentUserId || isCurrentUserAdmin
              return (
                <li
                  key={r.saved_id}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container-low transition-colors"
                >
                  <Link
                    href={`/listings/${r.listing_id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="w-14 h-14 rounded-lg bg-surface-container overflow-hidden flex-shrink-0">
                      {r.photos && r.photos[0] ? (
                        <img
                          src={r.photos[0]}
                          alt={r.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-on-surface-variant/40" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-on-surface truncate">{r.title}</p>
                      <p className="text-xs text-on-surface-variant">
                        {r.price != null ? `${formatPrice(r.price)}/mo` : '—'}
                        {r.city ? ` · ${r.city}` : ''}
                        {r.saved_by_name ? ` · saved by ${r.saved_by_name}` : ''}
                      </p>
                    </div>
                  </Link>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => handleRemove(r.saved_id)}
                      disabled={removingId === r.saved_id}
                      aria-label="Remove from group shortlist"
                      className="p-2 rounded-full text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors flex-shrink-0"
                    >
                      {removingId === r.saved_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
