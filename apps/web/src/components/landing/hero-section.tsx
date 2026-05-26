'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  ArrowRight,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  Heart,
  MapPin,
  Check,
} from 'lucide-react'
import { FLAGSHIP_CITIES } from '@/lib/cities'

const POPULAR: Array<{ label: string; citySlug: string }> = [
  { label: 'Liberty Village', citySlug: 'toronto' },
  { label: 'Mile End', citySlug: 'montreal' },
  { label: 'Kitsilano', citySlug: 'vancouver' },
  { label: 'Plateau', citySlug: 'montreal' },
]

/**
 * Map a guest's search query to the best public destination.
 * Matches flagship cities by slug/displayName/dbName; otherwise falls back
 * to Toronto so the click never dead-ends in a 404 or login wall.
 */
function resolveSearchDestination(query: string): string {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return '/c/toronto'
  const hit = FLAGSHIP_CITIES.find(
    (c) =>
      c.slug === normalized ||
      c.displayName.toLowerCase() === normalized ||
      c.dbName.toLowerCase() === normalized,
  )
  return hit ? `/c/${hit.slug}` : '/c/toronto'
}

export function HeroSection() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    router.push(resolveSearchDestination(query))
  }

  return (
    <section className="relative pt-4 lg:pt-12 pb-20 lg:pb-28 overflow-hidden">
      {/* Ambient ground — soft radial blooms + faint masked grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 18% 8%, rgba(0, 32, 69, 0.10), transparent 60%),' +
              'radial-gradient(ellipse 55% 45% at 92% 18%, rgba(0, 106, 96, 0.10), transparent 60%),' +
              'radial-gradient(ellipse 60% 40% at 50% 110%, rgba(255, 220, 196, 0.45), transparent 60%)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0,32,69,0.05) 1px, transparent 1px),' +
              'linear-gradient(to bottom, rgba(0,32,69,0.05) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            WebkitMaskImage:
              'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 75%)',
            maskImage:
              'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 75%)',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-12 gap-8 items-center">
        {/* LEFT */}
        <div className="col-span-12 lg:col-span-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-fixed/60 text-secondary text-xs font-semibold tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-secondary opacity-60 hero-pulse-ring" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
            </span>
            New · Lifestyle quiz v2 is live
          </div>

          <h1 className="font-display font-extrabold text-primary tracking-tight leading-[0.95] mt-6 text-[clamp(3rem,7vw,5.5rem)]">
            A roommate
            <br />
            you can{' '}
            <span
              className="px-1"
              style={{
                backgroundImage:
                  'linear-gradient(transparent 65%, rgba(140,245,228,.6) 65%)',
                backgroundRepeat: 'no-repeat',
              }}
            >
              actually
            </span>
            <br />
            live with.
          </h1>

          <p className="mt-7 text-lg lg:text-xl text-on-surface-variant max-w-xl leading-relaxed">
            Canada&rsquo;s trust-first housing platform. Verified profiles, real
            listings, and lifestyle matching that goes deeper than &ldquo;clean
            and quiet.&rdquo;
          </p>

          <form
            onSubmit={handleSearch}
            className="mt-9 max-w-xl bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_-12px_rgba(0,32,69,0.18)] p-2 flex items-center gap-2 ring-1 ring-outline-variant/40"
          >
            <label className="flex-1 flex items-center gap-3 px-4 py-2.5 min-w-0">
              <Search className="w-5 h-5 text-on-surface-variant shrink-0" />
              <input
                name="q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                placeholder="Toronto, Vancouver, Montreal…"
                className="w-full min-w-0 bg-transparent outline-none text-primary placeholder:text-outline text-base"
                aria-label="Search city or neighborhood"
              />
            </label>
            <div className="hidden sm:block w-px h-8 bg-outline-variant/50" />
            <Link
              href="/c/toronto"
              className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-semibold text-on-surface-variant hover:text-primary"
            >
              <SlidersHorizontal className="w-[18px] h-[18px]" />
              Browse
            </Link>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-3 bg-primary text-on-primary font-semibold rounded-xl hover:bg-primary-container transition-colors whitespace-nowrap"
            >
              Find matches
              <ArrowRight className="w-[18px] h-[18px]" />
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="text-on-surface-variant">Popular:</span>
            {POPULAR.map((p) => (
              <Link
                key={p.label}
                href={`/c/${p.citySlug}`}
                className="px-3 py-1 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>

        {/* RIGHT — product collage. Photos are placeholder Unsplash CDN URLs;
            swap for licensed/owned imagery before broader marketing. */}
        <div className="col-span-12 lg:col-span-6 relative">
          <div className="relative h-[600px] lg:h-[660px] mx-auto max-w-[560px]">
            {/* Background room */}
            <div
              className="absolute right-0 top-6 w-[72%] aspect-[4/5] rounded-3xl overflow-hidden rotate-[3deg] hero-float-c"
              style={{ boxShadow: '0 30px 60px -15px rgba(0,32,69,0.25)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Sunlit Toronto loft interior"
                className="w-full h-full object-cover"
                src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=70"
              />
              <div className="absolute bottom-4 left-4 right-4 bg-surface-container-lowest/95 backdrop-blur rounded-xl p-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Listing thumbnail"
                  className="w-10 h-10 rounded-lg shrink-0 object-cover"
                  src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=160&q=60"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-primary text-sm truncate">
                    Liberty Village Loft
                  </div>
                  <div className="text-[11px] text-on-surface-variant flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Toronto · 2 bd
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-bold text-primary text-sm">
                    $1,850
                  </div>
                  <div className="text-[10px] text-on-surface-variant">/ mo</div>
                </div>
              </div>
            </div>

            {/* Match card */}
            <div
              className="absolute left-0 top-24 w-[58%] bg-surface-container-lowest rounded-3xl p-5 -rotate-[4deg] hero-float-a ring-1 ring-outline-variant/30 z-10"
              style={{ boxShadow: '0 24px 50px -12px rgba(0,32,69,0.28)' }}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Marcus"
                    className="w-14 h-14 rounded-2xl object-cover"
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=70"
                  />
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-secondary grid place-items-center ring-2 ring-surface-container-lowest">
                    <Check className="w-3 h-3 text-on-secondary" strokeWidth={3} />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="font-display font-bold text-primary truncate">
                      Marcus J.
                    </div>
                    <span className="text-[10px] font-bold text-secondary bg-secondary-fixed/60 px-1.5 py-0.5 rounded">
                      ID
                    </span>
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    Designer · 28
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <svg viewBox="0 0 36 36" className="w-12 h-12">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e7e8e9" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="#006a60"
                    strokeWidth="3"
                    strokeDasharray="98 100"
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <div>
                  <div className="font-display font-extrabold text-primary text-2xl leading-none">
                    98<span className="text-base">%</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                    Match
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {[
                  { label: 'Sleep schedule', value: 'Aligned', pct: 95, color: 'bg-secondary' },
                  { label: 'Cleanliness', value: 'High', pct: 88, color: 'bg-secondary' },
                  { label: 'Noise tolerance', value: 'Quiet', pct: 72, color: 'bg-primary-container' },
                ].map((b) => (
                  <div key={b.label}>
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="text-on-surface-variant">{b.label}</span>
                      <span className="text-primary font-semibold">{b.value}</span>
                    </div>
                    <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className={`h-full ${b.color} rounded-full`} style={{ width: `${b.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <button className="mt-4 w-full py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-xl hover:bg-primary-container transition-colors">
                Connect
              </button>
            </div>

            {/* Verification chip */}
            <div
              className="absolute bottom-2 left-4 bg-surface-container-lowest rounded-2xl p-4 -rotate-[3deg] hero-float-b ring-1 ring-outline-variant/30 max-w-[230px] z-20"
              style={{ boxShadow: '0 18px 40px -10px rgba(0,32,69,0.22)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-secondary-fixed grid place-items-center">
                  <ShieldCheck className="w-[18px] h-[18px] text-secondary" />
                </div>
                <div className="font-display font-bold text-primary text-sm">
                  Identity verified
                </div>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Government ID checked. Filter to verified-only in one tap.
              </p>
            </div>

            {/* Notification */}
            <div
              className="absolute top-0 right-6 bg-surface-container-lowest rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 ring-1 ring-outline-variant/30 hero-float-b"
              style={{ boxShadow: '0 14px 30px -10px rgba(0,32,69,0.22)' }}
            >
              <div className="w-7 h-7 rounded-full bg-secondary-fixed grid place-items-center">
                <Heart className="w-[14px] h-[14px] text-secondary" fill="currentColor" />
              </div>
              <div className="leading-tight">
                <div className="text-[11px] text-on-surface-variant">
                  New match in
                </div>
                <div className="text-xs font-display font-bold text-primary">
                  Mile End, Montréal
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
