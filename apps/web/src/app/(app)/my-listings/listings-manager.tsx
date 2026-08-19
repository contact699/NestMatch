'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatPrice, formatDate } from '@/lib/utils'
import { clientLogger } from '@/lib/client-logger'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/modal'
import {
  PlusCircle,
  Home,
  MapPin,
  Calendar,
  Edit,
  Leaf,
  BarChart3,
  ArrowUpRight,
  Archive,
  ArchiveRestore,
  Trash2,
} from 'lucide-react'
import { deleteListing, setListingActive } from '@/lib/listing-mutations'

export interface MyListing {
  id: string
  title: string
  city: string
  province: string
  price: number
  photos: string[] | null
  available_date: string
  views_count: number | null
  is_active: boolean
  newcomer_friendly: boolean | null
  no_credit_history_ok: boolean | null
}

type TabId = 'all' | 'active' | 'archived'

export function ListingsManager({ listings }: { listings: MyListing[] }) {
  const router = useRouter()
  const [items, setItems] = useState<MyListing[]>(listings)
  // Resync when router.refresh() delivers fresh server data — otherwise the
  // initial prop snapshot goes permanently stale (render-time derived state).
  const [prevListings, setPrevListings] = useState(listings)
  if (prevListings !== listings) {
    setPrevListings(listings)
    setItems(listings)
  }
  const [tab, setTab] = useState<TabId>('all')
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<MyListing | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const activeCount = useMemo(() => items.filter((l) => l.is_active).length, [items])
  const archivedCount = items.length - activeCount
  const totalViews = useMemo(
    () => items.reduce((sum, l) => sum + (l.views_count || 0), 0),
    [items]
  )

  const visible = useMemo(() => {
    if (tab === 'active') return items.filter((l) => l.is_active)
    if (tab === 'archived') return items.filter((l) => !l.is_active)
    return items
  }, [items, tab])

  const handleToggleArchive = async (listing: MyListing) => {
    const nextActive = !listing.is_active
    setPendingIds((current) => new Set(current).add(listing.id))
    // Optimistic: keep the tab counts coherent immediately.
    setItems((current) =>
      current.map((l) => (l.id === listing.id ? { ...l, is_active: nextActive } : l))
    )

    try {
      await setListingActive(listing.id, nextActive)
      toast.success(nextActive ? 'Listing unarchived' : 'Listing archived')
      router.refresh()
    } catch (err) {
      // Roll back so the counts stay truthful.
      setItems((current) =>
        current.map((l) => (l.id === listing.id ? { ...l, is_active: listing.is_active } : l))
      )
      clientLogger.error('Failed to change listing status', err)
      toast.error(err instanceof Error ? err.message : 'Failed to update listing')
    } finally {
      setPendingIds((current) => {
        const next = new Set(current)
        next.delete(listing.id)
        return next
      })
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setIsDeleting(true)

    try {
      await deleteListing(target.id)
      setItems((current) => current.filter((l) => l.id !== target.id))
      setDeleteTarget(null)
      toast.success('Listing deleted')
      router.refresh()
    } catch (err) {
      clientLogger.error('Failed to delete listing', err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete listing')
    } finally {
      setIsDeleting(false)
    }
  }

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'all', label: 'All Listings', count: items.length },
    { id: 'active', label: 'Active', count: activeCount },
    { id: 'archived', label: 'Archived', count: archivedCount },
  ]

  return (
    <>
      {/* Stats row */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card variant="bordered">
            <CardContent className="py-5">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                Total Views
              </p>
              <p className="text-3xl font-display font-bold text-on-surface">
                {totalViews.toLocaleString()}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                Views counted across all of your listings.
              </p>
            </CardContent>
          </Card>
          <Card variant="bordered" className="bg-secondary-container">
            <CardContent className="py-5">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                Active
              </p>
              <p className="text-3xl font-display font-bold text-secondary">
                {String(activeCount).padStart(2, '0')}
              </p>
              <p className="text-xs text-secondary/70 mt-1">Visible to searchers</p>
            </CardContent>
          </Card>
          <Card variant="bordered">
            <CardContent className="py-5">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                Archived
              </p>
              <p className="text-3xl font-display font-bold text-on-surface">
                {String(archivedCount).padStart(2, '0')}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">Hidden from search results</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs + CTA */}
      <div className="flex items-center justify-between mb-6">
        <div className="inline-flex items-center bg-surface-container-low rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === t.id
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t.label} {t.count}
            </button>
          ))}
        </div>
        <Link href="/listings/new">
          <Button variant="glow">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Listing
          </Button>
        </Link>
      </div>

      {/* Listings */}
      {items.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="py-12 text-center">
            <Home className="h-12 w-12 text-on-surface-variant/30 mx-auto mb-4" />
            <h3 className="text-lg font-display font-medium text-on-surface mb-2">
              No listings yet
            </h3>
            <p className="text-on-surface-variant mb-4">
              Create your first listing to start finding compatible roommates.
            </p>
            <Link href="/listings/new">
              <Button variant="glow">
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Listing
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="py-12 text-center">
            <Home className="h-12 w-12 text-on-surface-variant/30 mx-auto mb-4" />
            <p className="text-on-surface-variant">
              {tab === 'archived'
                ? 'No archived listings. Archiving a listing hides it from search without deleting it.'
                : 'No active listings. Unarchive a listing to make it visible again.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((listing) => (
            <Card key={listing.id} variant="bordered" className="overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                {/* Image */}
                <div className="sm:w-48 sm:h-40 bg-surface-container flex-shrink-0 relative">
                  {listing.photos && listing.photos.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={listing.photos[0]}
                      alt={listing.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center min-h-[144px]">
                      <Home className="h-10 w-10 text-on-surface-variant/20" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    {listing.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="default">Archived</Badge>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/listings/${listing.id}`}>
                        <h3 className="font-display font-semibold text-on-surface hover:text-secondary transition-colors text-lg">
                          {listing.title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-1 text-sm text-on-surface-variant mt-0.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {listing.city}, {listing.province}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-display font-bold text-primary">
                        {formatPrice(listing.price)}
                        <span className="text-sm font-normal text-on-surface-variant">/mo</span>
                      </p>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-6 mt-3 text-sm text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5" />
                      {listing.views_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(listing.available_date)}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-2 mt-2">
                    {listing.newcomer_friendly && (
                      <span className="inline-flex items-center gap-1 text-xs bg-secondary-container text-secondary px-2 py-0.5 rounded-full">
                        <Leaf className="h-3 w-3" />
                        Newcomer Friendly
                      </span>
                    )}
                    {listing.no_credit_history_ok && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        No Credit OK
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 ghost-border-t">
                    <Link href={`/listings/${listing.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                    </Link>
                    <Link href={`/listings/${listing.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={pendingIds.has(listing.id)}
                      disabled={pendingIds.has(listing.id)}
                      onClick={() => handleToggleArchive(listing)}
                    >
                      {listing.is_active ? (
                        <>
                          <Archive className="h-3.5 w-3.5 mr-1.5" />
                          Archive
                        </>
                      ) : (
                        <>
                          <ArchiveRestore className="h-3.5 w-3.5 mr-1.5" />
                          Unarchive
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-error hover:bg-error-container"
                      onClick={() => setDeleteTarget(listing)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Delete
                    </Button>
                    {listing.is_active && (
                      <Link href={`/listings/${listing.id}`} className="ml-auto">
                        <Button variant="outline" size="sm">
                          Promote Listing
                          <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Listing?"
        message="This action cannot be undone. The listing will be permanently removed. To hide it from search instead, use Archive."
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  )
}
