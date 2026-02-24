'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle, ArrowRight, Globe, MapPin } from 'lucide-react'

const BENEFITS = [
  'Filter for "No Canadian credit history required"',
  'Find "Newcomer Friendly" hosts',
  'Connect with settlement agencies',
  'Multi-language support coming soon',
]

const CITIES = [
  { city: 'Toronto', count: '450+' },
  { city: 'Vancouver', count: '320+' },
  { city: 'Ottawa', count: '180+' },
  { city: 'Montreal', count: '240+' },
]

export function NewcomerSection() {
  return (
    <section className="py-24 lg:py-32 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div data-animate="fade-right">
            <span className="inline-block px-4 py-1.5 rounded-full bg-green-50 text-green-700 text-sm font-medium mb-4">
              Newcomer Friendly
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              New to Canada?
              <br />
              <span className="text-gradient">We&apos;ve got you.</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Finding housing as a newcomer is hard. No credit history, no
              references, no local network. NestMatch is built specifically to
              solve these challenges.
            </p>

            <ul className="space-y-4 mb-8">
              {BENEFITS.map((item, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 text-gray-700"
                >
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <Link href="/signup">
              <Button
                size="lg"
                className="btn-glow bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border-0 shadow-lg shadow-green-500/25"
              >
                Get started free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          <div className="relative" data-animate="fade-left">
            {/* Cities card */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">
                    Available in
                  </h3>
                  <p className="text-gray-400">Major Canadian cities</p>
                </div>
              </div>

              <div className="space-y-3">
                {CITIES.map((item, index) => (
                  <div
                    key={item.city}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                      <span className="text-white font-medium">
                        {item.city}
                      </span>
                    </div>
                    <span className="text-gray-400 text-sm">
                      {item.count} listings
                    </span>
                  </div>
                ))}
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl opacity-20 blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl opacity-20 blur-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
