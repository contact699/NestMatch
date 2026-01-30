'use client'

import { Zap, Heart, MessageCircle } from 'lucide-react'

const STEPS = [
  {
    step: '01',
    title: 'Create & Verify',
    description:
      'Sign up, complete your lifestyle quiz, and verify your identity. It takes less than 10 minutes.',
    icon: Zap,
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
    <section className="py-24 lg:py-32 bg-gray-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-50/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16" data-animate>
          <span className="inline-block px-4 py-1.5 rounded-full bg-purple-50 text-purple-700 text-sm font-medium mb-4">
            Simple Process
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            How NestMatch works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
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
                <div className="hidden md:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-gray-300 to-transparent" />
              )}

              <div className="relative bg-white rounded-2xl p-8 shadow-lg shadow-gray-200/50 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-5xl font-bold text-gray-200">
                    {item.step}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
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
