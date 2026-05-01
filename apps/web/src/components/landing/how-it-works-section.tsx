'use client'

const STEPS = [
  {
    num: '1',
    tag: 'Sign up',
    title: 'Verify & quiz',
    description:
      'Sign up, take the lifestyle quiz, and verify your ID. The trust badge unlocks better matches.',
  },
  {
    num: '2',
    tag: 'Browse',
    title: 'Match & chat',
    description:
      'See compatibility scores per listing and per person. Message securely, share photos, schedule viewings.',
  },
  {
    num: '3',
    tag: 'Move in',
    title: 'Sign & settle',
    description:
      'Generate a roommate agreement, split rent & utilities, and use shared move-in checklists.',
  },
]

export function HowItWorksSection() {
  return (
    <section className="py-24 lg:py-32 bg-surface-container-low relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl" data-animate>
          <span className="text-secondary font-bold tracking-widest uppercase text-xs">
            How it works
          </span>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-primary mt-3">
            Three steps to a real home.
          </h2>
          <p className="mt-4 text-lg text-on-surface-variant">
            From verifying your profile to signing the lease — everything in
            one place.
          </p>
        </div>

        <ol className="mt-14 grid md:grid-cols-3 gap-6 relative">
          <div className="hidden md:block absolute top-9 left-[16%] right-[16%] h-px bg-gradient-to-r from-outline-variant/0 via-outline-variant/60 to-outline-variant/0" />
          {STEPS.map((s, i) => (
            <li
              key={s.num}
              className="bg-surface-container-lowest rounded-3xl p-7 shadow-sm relative"
              data-animate
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-primary text-on-primary grid place-items-center font-display font-bold">
                  {s.num}
                </span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                  {s.tag}
                </span>
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-primary">
                {s.title}
              </h3>
              <p className="mt-1.5 text-on-surface-variant text-sm leading-relaxed">
                {s.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
