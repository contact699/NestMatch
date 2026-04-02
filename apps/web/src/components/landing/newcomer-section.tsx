'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle, ArrowRight, Globe, MapPin } from 'lucide-react'

const BENEFITS = [
  'Filter for "No Canadian credit history required"',
  'Find "Newcomer Friendly" hosts',
  'Connect with settlement agencies',
  'Multi-language support',
]

const CITIES = [
  { city: 'Toronto' },
  { city: 'Vancouver' },
  { city: 'Ottawa' },
  { city: 'Montreal' },
]

export function NewcomerSection() {
  return (
    <section className="py-24 lg:py-32 bg-surface-container-lowest relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div data-animate="fade-right">
            <span className="text-secondary font-bold tracking-widest uppercase text-xs">
              Newcomer Friendly
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-primary mb-6 mt-2">
              New to Canada?
              <br />
              <span className="text-gradient">We&apos;ve got you.</span>
            </h2>
            <p className="text-xl text-on-surface-variant mb-8 leading-relaxed">
              Finding housing as a newcomer is hard. No credit history, no
              references, no local network. NestMatch is built specifically to
              solve these challenges.
            </p>

            <ul className="space-y-4 mb-8">
              {BENEFITS.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 text-on-surface"
                >
                  <div className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-secondary" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <Link href="/signup">
              <Button
                size="lg"
                className="btn-glow"
              >
                Get started free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          <div className="relative" data-animate="fade-left">
            {/* Cities card */}
            <div className="bg-primary rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-on-primary/10 flex items-center justify-center">
                  <Globe className="h-6 w-6 text-on-primary" />
                </div>
                <div>
                  <h3 className="text-on-primary font-semibold text-lg font-display">
                    Available in
                  </h3>
                  <p className="text-on-primary/60">Major Canadian cities</p>
                </div>
              </div>

              <div className="space-y-3">
                {CITIES.map((item, index) => (
                  <div
                    key={item.city}
                    className="flex items-center justify-between p-4 rounded-xl bg-on-primary/5 hover:bg-on-primary/10 transition-colors group cursor-pointer"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-on-primary/40 group-hover:text-secondary-container transition-colors" />
                      <span className="text-on-primary font-medium">
                        {item.city}
                      </span>
                    </div>
                    <span className="text-on-primary/40 text-sm">
                      Available
                    </span>
                  </div>
                ))}
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-secondary/20 rounded-2xl blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-secondary-container/20 rounded-2xl blur-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
