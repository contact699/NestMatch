'use client'

import Link from 'next/link'
import { FLAGSHIP_CITIES } from '@/lib/cities'

export function Footer() {
  return (
    <footer className="w-full bg-surface-container-low">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className="font-display font-bold text-lg text-primary"
            >
              NestMatch
            </Link>
            <p className="text-xs tracking-wide text-on-surface-variant">
              Find your perfect roommate in Canada.
            </p>
          </div>

          {/* Cities */}
          <div>
            <h4 className="font-display font-semibold text-on-surface text-sm mb-3">
              Cities
            </h4>
            <ul className="space-y-2">
              {FLAGSHIP_CITIES.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/c/${c.slug}`}
                    className="text-xs tracking-wide text-on-surface-variant hover:underline decoration-secondary underline-offset-4 transition-opacity hover:opacity-80"
                  >
                    Rooms in {c.displayName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Guides */}
          <div>
            <h4 className="font-display font-semibold text-on-surface text-sm mb-3">
              Guides
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/resources/guides"
                  className="text-xs tracking-wide text-on-surface-variant hover:underline decoration-secondary underline-offset-4 transition-opacity hover:opacity-80"
                >
                  All guides
                </Link>
              </li>
              <li>
                <Link
                  href="/resources/faq"
                  className="text-xs tracking-wide text-on-surface-variant hover:underline decoration-secondary underline-offset-4 transition-opacity hover:opacity-80"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold text-on-surface text-sm mb-3">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-xs tracking-wide text-on-surface-variant hover:underline decoration-secondary underline-offset-4 transition-opacity hover:opacity-80"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-xs tracking-wide text-on-surface-variant hover:underline decoration-secondary underline-offset-4 transition-opacity hover:opacity-80"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/trust"
                  className="text-xs tracking-wide text-on-surface-variant hover:underline decoration-secondary underline-offset-4 transition-opacity hover:opacity-80"
                >
                  Trust &amp; Safety
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-outline-variant pt-6">
          <p className="text-xs tracking-wide text-on-surface-variant text-center">
            &copy; {new Date().getFullYear()} NestMatch Technologies Incorporated
          </p>
        </div>
      </div>
    </footer>
  )
}
