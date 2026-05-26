'use client'

import Link from 'next/link'
import { ArrowRight, Check, ShieldCheck, Home, MessageCircle, FileText } from 'lucide-react'

const WHAT_YOU_GET = [
  {
    icon: ShieldCheck,
    title: 'Optional ID verification',
    description: 'Trust badge on your profile after a Certn ID check.',
  },
  {
    icon: Home,
    title: 'Ownership-verified listings',
    description: 'Hosts prove the place is theirs before it goes live.',
  },
  {
    icon: MessageCircle,
    title: 'Lifestyle compatibility',
    description: 'Match scores per listing and per person.',
  },
  {
    icon: FileText,
    title: 'Roommate agreements',
    description: 'Generate, share rent and utilities, settle in.',
  },
]

const TRUST_POINTS = ['Free to join', 'No credit card', 'Verify when you’re ready']

export function CTASection() {
  return (
    <section className="py-24 lg:py-32 bg-surface-container-lowest">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-primary rounded-[2.5rem] overflow-hidden">
          {/* Ambient blooms — same accent palette as the hero */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-80"
            style={{
              background:
                'radial-gradient(ellipse 60% 80% at 85% 0%, rgba(140,245,228,0.25), transparent 60%),' +
                'radial-gradient(ellipse 50% 70% at 0% 100%, rgba(255,220,196,0.18), transparent 60%)',
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),' +
                'linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
              WebkitMaskImage:
                'radial-gradient(ellipse 70% 60% at 50% 50%, black, transparent 75%)',
              maskImage:
                'radial-gradient(ellipse 70% 60% at 50% 50%, black, transparent 75%)',
            }}
          />

          <div className="relative grid lg:grid-cols-12 gap-10 p-8 sm:p-10 lg:p-16 items-center">
            <div className="lg:col-span-7">
              <h2 className="font-display text-4xl lg:text-6xl font-extrabold text-on-primary tracking-tight leading-[0.95]">
                Ready to find your
                <br />
                <span
                  className="px-1"
                  style={{
                    backgroundImage:
                      'linear-gradient(transparent 65%, rgba(140,245,228,0.5) 65%)',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  perfect
                </span>{' '}
                sanctuary?
              </h2>
              <p className="mt-5 text-lg text-primary-fixed-dim max-w-xl leading-relaxed">
                Join Canadians redefining communal living through trust and
                compatibility. Free to join, verified by choice.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/signup"
                  className="px-6 py-4 bg-secondary-container text-primary font-bold rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                  Create free profile
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/c/toronto"
                  className="px-6 py-4 bg-white/10 text-on-primary border border-white/20 font-semibold rounded-xl hover:bg-white/20 transition-colors backdrop-blur text-center"
                >
                  Browse listings
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-x-6 gap-y-2 text-sm text-primary-fixed-dim flex-wrap">
                {TRUST_POINTS.map((p) => (
                  <div key={p} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-secondary-container" />
                    {p}
                  </div>
                ))}
              </div>
            </div>

            {/* Right column: real product features instead of fabricated stats */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {WHAT_YOU_GET.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="bg-white/10 backdrop-blur rounded-2xl p-5 ring-1 ring-white/15"
                >
                  <Icon className="w-5 h-5 text-secondary-container" />
                  <div className="font-display font-bold text-on-primary text-base mt-3">
                    {title}
                  </div>
                  <div className="text-xs text-primary-fixed-dim mt-1 leading-relaxed">
                    {description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
