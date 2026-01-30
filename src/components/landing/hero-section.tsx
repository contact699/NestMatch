'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center hero-gradient pt-16">
      {/* Animated background orbs */}
      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />
      <div className="gradient-orb gradient-orb-3" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Animated badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-blue-100 shadow-lg mb-8 animate-fade-in-down">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">
              Canada&apos;s Trust-First Roommate Platform
            </span>
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 tracking-tight animate-fade-in-up">
            Find roommates you can
            <br />
            <span className="text-gradient-animated">actually trust</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200 opacity-0 text-balance">
            The only platform where every user is verified, every listing is
            real, and compatibility is based on how you actually live.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-400 opacity-0">
            <Link href="/signup">
              <Button
                size="lg"
                className="btn-glow bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 text-lg px-8 py-6 shadow-xl shadow-blue-500/25 group"
              >
                Start matching free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/search">
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 bg-white/80 backdrop-blur-sm border-2 hover:bg-white hover:border-gray-300"
              >
                Browse listings
              </Button>
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-16 flex flex-col items-center gap-4 animate-fade-in-up delay-600 opacity-0">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-lg"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              Join <span className="font-semibold text-gray-700">2,500+</span>{' '}
              Canadians finding their perfect match
            </p>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-subtle">
        <div className="w-6 h-10 rounded-full border-2 border-gray-300 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-gray-400 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  )
}
