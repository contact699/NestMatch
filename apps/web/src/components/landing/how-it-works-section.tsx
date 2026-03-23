'use client'

import { ShieldCheck, Heart, MessageCircle } from 'lucide-react'

const STEPS = [
  {
    step: '01',
    title: 'Create & Verify',
    description:
      'Sign up, complete your lifestyle quiz, and verify your identity. It takes less than 10 minutes.',
    icon: ShieldCheck,
  },
  {
    step: '02',
    title: 'Browse & Match',
    description:
      'Search listings or roommate profiles. See compatibility scores based on your lifestyle preferences.',
    icon: Heart,
  },
  {
    step: '03',
    title: 'Connect & Move In',
    description:
      'Message your matches securely on the platform. Schedule viewings and find your new home.',
    icon: MessageCircle,
  },
]

export function HowItWorksSection() {
  return (
    <section className="py-24 lg:py-32 bg-surface-container-low relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16" data-animate>
          <span className="text-secondary font-bold tracking-widest uppercase text-xs">
            Simple Process
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-primary mb-6 mt-2">
            How NestMatch works
          </h2>
          <p className="text-xl text-on-surface-variant max-w-2xl mx-auto">
            Find your perfect roommate in three simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {STEPS.map((item, index) => (
            <div
              key={item.step}
              className="relative"
              data-animate
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Connector line */}
              {index < 2 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-outline-variant to-transparent" />
              )}

              <div className="relative bg-surface-container-lowest rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-5xl font-bold text-surface-container-high font-display">
                    {item.step}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                    <item.icon className="h-6 w-6 text-on-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-primary mb-3 font-display">
                  {item.title}
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
