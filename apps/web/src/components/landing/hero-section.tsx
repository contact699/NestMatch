'use client'

import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative px-6 py-20 lg:py-32 overflow-hidden bg-background">
      <div className="max-w-7xl mx-auto editorial-grid gap-8">
        {/* Left content */}
        <div className="col-span-12 lg:col-span-7 z-10">
          <h1 className="font-display text-5xl lg:text-7xl font-extrabold text-primary tracking-tight leading-tight mb-6">
            Find roommates you <br />
            <span className="text-secondary italic">can actually</span>{' '}
            trust.
          </h1>

          <p className="text-xl text-on-surface-variant max-w-xl mb-10 leading-relaxed">
            Canada&apos;s first trust-centric housing platform. We pair optional
            ID verification with lifestyle matching to create living situations
            that actually work.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/signup">
              <button className="px-8 py-4 bg-primary text-on-primary font-semibold rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2">
                Get Started
                <ArrowRight className="h-5 w-5" />
              </button>
            </Link>
            <Link href="/search">
              <button className="px-8 py-4 bg-surface-container-high text-primary font-semibold rounded-xl hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2">
                Find a Roommate
              </button>
            </Link>
          </div>

          {/* Social proof - honest version */}
          <div className="mt-16 flex items-center gap-6">
            <div className="flex -space-x-4">
              {[
                'bg-primary',
                'bg-secondary',
                'bg-primary-container',
              ].map((bg, i) => (
                <div
                  key={i}
                  className={`w-12 h-12 rounded-full border-4 border-background ${bg} flex items-center justify-center text-white text-xs font-bold`}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <div>
              <p className="font-bold text-primary text-lg">
                Trust-first community
              </p>
              <p className="text-sm text-on-surface-variant">
                Live in Toronto, Vancouver &amp; Montreal
              </p>
            </div>
          </div>
        </div>

        {/* Right side — floating image + trust badge */}
        <div className="col-span-12 lg:col-span-5 relative mt-12 lg:mt-0">
          <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500 bg-surface-container">
            {/* Placeholder interior image via gradient */}
            <div className="w-full h-full bg-gradient-to-br from-surface-container-low via-surface-container to-surface-container-high flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-12 w-12 text-primary" />
                </div>
                <p className="text-on-surface-variant font-display font-semibold text-lg">
                  Real Living Spaces
                </p>
                <p className="text-on-surface-variant/70 text-sm mt-2">
                  Real listings from real hosts
                </p>
              </div>
            </div>
          </div>

          {/* Trust Badge Overlay */}
          <div className="absolute -bottom-6 -left-6 bg-surface-container-lowest p-6 rounded-2xl shadow-xl max-w-[240px]">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-secondary-container p-2 rounded-full">
                <ShieldCheck className="h-5 w-5 text-secondary" />
              </div>
              <span className="font-bold text-primary">Identity Verification</span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Optional government ID verification available — verified users
              display a trust badge.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
