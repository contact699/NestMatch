'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Star, ArrowRight, Lock, ShieldCheck, Heart } from 'lucide-react'

export function CTASection() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100 rounded-full opacity-50 blur-3xl" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
        <div data-animate>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/50 mb-8">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium text-gray-700">
              Trusted by thousands across Canada
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Ready to find your
            <br />
            <span className="text-gradient-animated">perfect roommate?</span>
          </h2>

          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Join thousands of Canadians who found their ideal living situation
            through NestMatch. Verification is free, matching is free.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button
                size="lg"
                className="btn-glow bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 text-lg px-10 py-6 shadow-xl shadow-blue-500/25 group"
              >
                Create free account
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 mt-12 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span>Bank-level security</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span>ID verification</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span>Made in Canada</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
