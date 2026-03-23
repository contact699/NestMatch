'use client'

import Link from 'next/link'
import { CheckCircle, ChevronRight } from 'lucide-react'

const MOCK_MATCHES = [
  {
    name: 'Marcus Jensen',
    role: 'Product Designer',
    age: 28,
    score: 98,
    tags: ['Non-smoker', 'Early riser', 'Dog friendly'],
  },
  {
    name: 'Sarah Chen',
    role: 'Medical Resident',
    age: 31,
    score: 94,
    tags: ['Quiet hours', 'Plant lover', 'Clean freak'],
  },
  {
    name: 'Jordan Blake',
    role: 'Marketing Exec',
    age: 26,
    score: 91,
    tags: ['Social', 'Foodie', 'WFH'],
  },
]

export function TopMatchesSection() {
  return (
    <section className="py-24 bg-surface-container-low">
      <div className="max-w-7xl mx-auto px-6">
        <div
          className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4"
          data-animate
        >
          <div>
            <span className="text-secondary font-bold tracking-widest uppercase text-xs">
              Recommended for you
            </span>
            <h2 className="font-display text-4xl font-bold text-primary mt-2">
              Top Matches
            </h2>
          </div>
          <Link
            href="/dashboard"
            className="text-primary font-semibold flex items-center gap-1 hover:underline underline-offset-4"
          >
            View all candidates{' '}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {MOCK_MATCHES.map((match, index) => (
            <div
              key={match.name}
              className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow group"
              data-animate
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Photo placeholder */}
              <div className="relative mb-6">
                <div className="aspect-square rounded-xl overflow-hidden bg-surface-container">
                  <div className="w-full h-full bg-gradient-to-br from-surface-container to-surface-container-high flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                    <span className="text-6xl font-display font-bold text-on-surface-variant/20">
                      {match.name.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="absolute top-4 right-4 bg-secondary text-on-secondary px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </div>
              </div>

              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-display text-xl font-bold text-primary">
                    {match.name}
                  </h3>
                  <p className="text-sm text-on-surface-variant">
                    {match.role} &bull; {match.age}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-secondary font-bold text-lg">
                    {match.score}%
                  </div>
                  <div className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter">
                    Match Score
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {match.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-surface-container text-on-surface-variant text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <button className="w-full py-3 border border-primary text-primary font-bold rounded-lg hover:bg-primary hover:text-on-primary transition-colors">
                Connect
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
