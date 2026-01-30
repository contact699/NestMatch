'use client'

import { ShieldCheck, CheckCircle, Users } from 'lucide-react'

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'ID Verified Users',
    description:
      'Every user goes through government ID verification. No fake profiles, no catfishing, no scams.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: CheckCircle,
    title: 'Real Listings Only',
    description:
      'We verify listing ownership. No bait-and-switch, no phantom apartments, no wasted viewings.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: Users,
    title: 'Lifestyle Matching',
    description:
      'Our compatibility quiz matches you based on sleep schedules, cleanliness, noise tolerance, and more.',
    gradient: 'from-purple-500 to-pink-500',
  },
]

export function TrustFeaturesSection() {
  return (
    <section className="py-24 lg:py-32 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16" data-animate>
          <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4">
            Why NestMatch?
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Built on trust, not hope
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Every feature designed to eliminate scams, fake listings, and
            roommate surprises.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className="feature-card group"
              data-animate
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div
                className={`feature-icon bg-gradient-to-br ${feature.gradient} shadow-lg`}
              >
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
