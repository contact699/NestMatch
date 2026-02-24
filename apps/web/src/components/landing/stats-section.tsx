'use client'

const STATS = [
  { value: '2.5K+', label: 'Active Users' },
  { value: '95%', label: 'Verified Profiles' },
  { value: '1.2K', label: 'Successful Matches' },
  { value: '4.9', label: 'User Rating', suffix: '/5' },
]

export function StatsSection() {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-white rounded-full filter blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full filter blur-3xl animate-float-slow" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center"
              data-animate
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-2">
                {stat.value}
                {stat.suffix && (
                  <span className="text-2xl text-white/70">{stat.suffix}</span>
                )}
              </div>
              <div className="text-white/80 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
