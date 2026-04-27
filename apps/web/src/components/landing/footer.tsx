'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="w-full bg-surface-container-low">
      <div className="max-w-7xl mx-auto px-8 py-12 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link
            href="/"
            className="font-display font-bold text-lg text-primary"
          >
            NestMatch
          </Link>
          <p className="text-xs tracking-wide text-on-surface-variant text-center md:text-left">
            &copy; {new Date().getFullYear()} NestMatch Technologies Incorporated
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          <Link
            href="/privacy"
            className="text-xs tracking-wide text-on-surface-variant hover:underline decoration-secondary underline-offset-4 transition-opacity hover:opacity-80"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-xs tracking-wide text-on-surface-variant hover:underline decoration-secondary underline-offset-4 transition-opacity hover:opacity-80"
          >
            Terms of Service
          </Link>
          <Link
            href="/trust"
            className="text-xs tracking-wide text-on-surface-variant hover:underline decoration-secondary underline-offset-4 transition-opacity hover:opacity-80"
          >
            Trust &amp; Safety
          </Link>
        </div>
      </div>
    </footer>
  )
}
