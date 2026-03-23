'use client'

import Link from 'next/link'

export function CTASection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto bg-primary rounded-[3rem] p-12 lg:p-20 text-center relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="font-display text-4xl lg:text-6xl font-extrabold text-on-primary mb-8 tracking-tight">
            Ready to find your <br />
            perfect sanctuary?
          </h2>
          <p className="text-primary-fixed-dim text-xl max-w-2xl mx-auto mb-12">
            Join verified Canadians who have redefined communal living through
            trust and compatibility.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link href="/signup">
              <button className="px-10 py-5 bg-secondary-container text-primary font-bold rounded-2xl shadow-xl hover:scale-105 transition-transform">
                Create Free Profile
              </button>
            </Link>
            <Link href="/search">
              <button className="px-10 py-5 bg-primary-container text-on-primary border border-outline-variant/30 font-bold rounded-2xl hover:bg-surface-tint/30 transition-all">
                Browse Listings
              </button>
            </Link>
          </div>
        </div>

        {/* Abstract Design Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-container/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-surface-tint/20 rounded-full blur-3xl -ml-32 -mb-32" />
      </div>
    </section>
  )
}
