'use client'

const STATS = [
  { value: '3', label: 'Major Cities', suffix: '' },
  { value: '100%', label: 'Verified Profiles', suffix: '' },
  { value: '95%', label: 'Match Satisfaction', suffix: '' },
  { value: '4.9', label: 'User Rating', suffix: '/5' },
]

export function StatsSection() {
  return (
    <section className="py-20 bg-primary relative overflow-hidden">
      {/* Abstract design elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-container/10 rounded-full blur-3xl -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-surface-tint/20 rounded-full blur-3xl -ml-32 -mb-32" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center"
              data-animate
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-on-primary mb-2 font-display">
                {stat.value}
                {stat.suffix && (
                  <span className="text-2xl text-on-primary/70">
                    {stat.suffix}
                  </span>
                )}
              </div>
              <div className="text-on-primary/80 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
