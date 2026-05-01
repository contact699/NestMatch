'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { clientLogger } from '@/lib/client-logger'
import { Heart, MapPin, BadgeCheck, ArrowRight, Loader2, Home } from 'lucide-react'

interface Listing {
  id: string
  title: string
  description: string | null
  city: string
  province: string
  price: number
  type: 'room' | 'shared_room' | 'entire_place'
  photos: string[] | null
  newcomer_friendly: boolean
  no_credit_history_ok: boolean
  utilities_included: boolean
  available_date: string
  created_at: string
  user_id: string
  profiles: {
    name: string | null
    verification_level: string
    profile_photo: string | null
  } | null
}

const CITY_FILTERS = ['All', 'Toronto', 'Montréal', 'Vancouver'] as const
type CityFilter = (typeof CITY_FILTERS)[number]

function typeLabel(type: Listing['type']): string {
  return type === 'shared_room'
    ? 'Shared rm'
    : type === 'entire_place'
      ? 'Entire place'
      : 'Private rm'
}

export function FeaturedListingsSection() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [city, setCity] = useState<CityFilter>('All')

  useEffect(() => {
    async function fetchListings() {
      try {
        const response = await fetch('/api/listings/public')
        if (response.ok) {
          const data = await response.json()
          setListings(data.listings || [])
        } else {
          setError(true)
        }
      } catch (err) {
        clientLogger.error('Error fetching featured listings', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchListings()
  }, [])

  if (!loading && listings.length === 0) return null

  const filtered =
    city === 'All'
      ? listings
      : listings.filter((l) =>
          l.city.toLowerCase().includes(city.toLowerCase().replace('é', 'e')),
        )

  return (
    <section className="py-24 lg:py-32 bg-surface-container-lowest relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(140,245,228,0.25), transparent 70%)',
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12" data-animate>
          <div className="max-w-2xl">
            <span className="text-secondary font-bold tracking-widest uppercase text-xs">
              Just posted
            </span>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-primary mt-3 leading-[1.05]">
              Rooms hitting the
              <br />
              market this week.
            </h2>
            <p className="mt-4 text-lg text-on-surface-variant">
              Real listings, verified ownership. Sign up to see your compatibility score.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {CITY_FILTERS.map((c) => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className={
                  c === city
                    ? 'px-4 py-2.5 text-sm font-semibold rounded-full bg-primary text-on-primary'
                    : 'px-4 py-2.5 text-sm font-semibold rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors'
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <Home className="h-12 w-12 text-outline-variant mx-auto mb-4" />
            <p className="text-on-surface-variant">
              Unable to load listings. Please try again later.
            </p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {filtered.slice(0, 8).map((l) => {
                const photo = l.photos?.[0]
                return (
                  <Link
                    key={l.id}
                    href={`/signup?redirect=/listings/${l.id}`}
                    className="group bg-background rounded-3xl overflow-hidden ring-1 ring-outline-variant/30 hover:-translate-y-1 transition-transform"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-surface-container-low">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt={l.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center">
                          <Home className="w-10 h-10 text-outline-variant" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        {l.newcomer_friendly && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-secondary-fixed/90 text-secondary backdrop-blur">
                            Newcomer friendly
                          </span>
                        )}
                        {l.utilities_included && !l.newcomer_friendly && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-tertiary-fixed text-tertiary backdrop-blur">
                            Utilities incl.
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label="Save listing"
                        onClick={(e) => e.preventDefault()}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-container-lowest/90 backdrop-blur grid place-items-center hover:bg-surface-container-lowest"
                      >
                        <Heart className="w-4 h-4 text-primary" />
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display font-bold text-primary truncate">
                          {l.title}
                        </h3>
                        <div className="text-right shrink-0">
                          <div className="font-display font-bold text-primary">
                            ${l.price.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-on-surface-variant -mt-0.5">/mo</div>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-on-surface-variant flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {l.city}, {l.province} · {typeLabel(l.type)}
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {l.profiles?.profile_photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={l.profiles.profile_photo}
                              alt={l.profiles.name || 'Host'}
                              className="w-6 h-6 rounded-full object-cover ring-2 ring-background"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary-fixed-dim ring-2 ring-background" />
                          )}
                          <span className="text-xs font-semibold text-primary truncate">
                            {l.profiles?.name || 'Host'}
                          </span>
                          {l.profiles?.verification_level &&
                            l.profiles.verification_level !== 'basic' && (
                              <BadgeCheck className="w-3.5 h-3.5 text-secondary shrink-0" />
                            )}
                        </div>
                        <span className="text-xs font-semibold text-primary flex items-center gap-1 shrink-0">
                          View
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-outline-variant/30">
              <p className="text-sm text-on-surface-variant">
                {filtered.length === 0
                  ? `No listings in ${city} yet.`
                  : (
                      <>
                        Showing {Math.min(filtered.length, 8)} of{' '}
                        <span className="font-bold text-primary">
                          {filtered.length}
                        </span>{' '}
                        {city === 'All' ? 'listings' : `listings in ${city}`}.
                      </>
                    )}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/search"
                  className="px-5 py-3 text-sm font-semibold rounded-xl ring-1 ring-outline-variant/40 text-primary bg-background hover:bg-surface-container-low flex items-center justify-center gap-2 transition-colors"
                >
                  Browse all listings
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-3 text-sm font-semibold rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors text-center"
                >
                  Sign up to contact hosts
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
