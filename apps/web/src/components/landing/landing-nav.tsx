'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LogoMark } from '@/components/ui/logo-mark'

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'glass-nav shadow-sm'
          : 'bg-white/80 backdrop-blur-md'
      }`}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 no-underline"
        >
          <LogoMark size={32} />
          <span className="font-logo text-lg font-semibold text-primary tracking-[-0.02em] leading-none">
            NestMatch
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/#how-it-works"
            className="text-on-surface-variant hover:text-primary transition-colors font-display font-semibold tracking-tight"
          >
            How it works
          </Link>
          <Link
            href="/search"
            className="text-on-surface-variant hover:text-primary transition-colors font-display font-semibold tracking-tight"
          >
            Browse listings
          </Link>
          <Link
            href="/roommates"
            className="text-on-surface-variant hover:text-primary transition-colors font-display font-semibold tracking-tight"
          >
            Find roommates
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login" aria-label="Sign in">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center text-on-surface-variant font-display font-bold text-sm">
              <svg className="h-5 w-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </Link>
        </div>
      </div>
    </nav>
  )
}
