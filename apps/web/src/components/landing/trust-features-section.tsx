'use client'

import Link from 'next/link'
import { ShieldCheck, Home, Users, ArrowRight } from 'lucide-react'

const FEATURES = [
  {
    icon: ShieldCheck,
    iconBg: 'bg-primary',
    title: 'Optional ID verification',
    description:
      'Government ID check via Persona. Verified members display a trust badge — filter to verified-only in one tap.',
    cta: 'How verification works',
    href: '/how-verification-works',
  },
  {
    icon: Home,
    iconBg: 'bg-secondary',
    title: 'Real listings only',
    description:
      'We verify ownership before a listing goes live. No bait-and-switch, no phantom apartments, no wasted viewings.',
    cta: 'See verified listings',
    href: '/c/toronto',
  },
  {
    icon: Users,
    iconBg: 'bg-primary-container',
    title: 'Lifestyle matching',
    description:
      'Sleep, cleanliness, noise, guests, pets, work-from-home — many dimensions, weighted by what matters to you.',
    cta: 'Take the quiz',
    href: '/signup?intent=quiz',
  },
]

export function TrustFeaturesSection() {
  return (
    <section className="py-24 lg:py-32 bg-surface-container-lowest">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl" data-animate>
          <span className="text-secondary font-bold tracking-widest uppercase text-xs">
            Why NestMatch
          </span>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-primary mt-3">
            Built on trust, not hope.
          </h2>
          <p className="mt-4 text-lg text-on-surface-variant">
            Every feature designed to eliminate scams, fake listings, and
            roommate surprises.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <article
              key={f.title}
              className="relative bg-background rounded-3xl p-7 ring-1 ring-outline-variant/30 hover:-translate-y-1 transition-transform group"
              data-animate
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div
                className={`w-12 h-12 rounded-xl ${f.iconBg} text-on-primary grid place-items-center mb-5 shadow-md`}
              >
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-primary">
                {f.title}
              </h3>
              <p className="mt-2 text-on-surface-variant leading-relaxed">
                {f.description}
              </p>
              <Link
                href={f.href}
                className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                {f.cta}
                <ArrowRight className="w-[18px] h-[18px] transition-transform group-hover:translate-x-1" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
