'use client'

import { ShieldCheck, CheckCircle, Users } from 'lucide-react'

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'ID Verified Users',
    description:
      'Every user goes through government ID verification. No fake profiles, no catfishing, no scams.',
  },
  {
    icon: CheckCircle,
    title: 'Real Listings Only',
    description:
      'We verify listing ownership. No bait-and-switch, no phantom apartments, no wasted viewings.',
  },
  {
    icon: Users,
    title: 'Lifestyle Matching',
    description:
      'Our compatibility quiz matches you based on sleep schedules, cleanliness, noise tolerance, and more.',
  },
]

export function TrustFeaturesSection() {
  return (
    <section className="py-24 lg:py-32 bg-surface-container-lowest relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16" data-animate>
          <span className="text-secondary font-bold tracking-widest uppercase text-xs">
            Why NestMatch?
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-primary mb-6 mt-2">
            Built on trust, not hope
          </h2>
          <p className="text-xl text-on-surface-variant max-w-2xl mx-auto">
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
              <div className="feature-icon bg-primary shadow-lg">
                <feature.icon className="h-6 w-6 text-on-primary" />
              </div>
              <h3 className="text-xl font-semibold text-primary mb-3 font-display">
                {feature.title}
              </h3>
              <p className="text-on-surface-variant leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
