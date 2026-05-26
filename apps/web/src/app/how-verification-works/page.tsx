import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, FileCheck, Smartphone, Scale, ArrowRight, Check } from 'lucide-react'
import { LandingNav, Footer } from '@/components/landing'

export const metadata: Metadata = {
  title: 'How verification works | NestMatch',
  description:
    'NestMatch verifies identity, ownership, and trust signals before members go live. Learn what we check, who does the checking, and why verification is optional but valuable.',
  alternates: { canonical: 'https://www.nestmatch.app/how-verification-works' },
}

const CHECKS = [
  {
    icon: FileCheck,
    title: 'Government ID',
    body: 'Persona (an Anthropic-grade KYC provider) confirms your government-issued ID matches the photo you upload. We never see your ID document directly.',
  },
  {
    icon: Smartphone,
    title: 'Phone & email',
    body: 'Real, reachable contact details — no burner numbers, no temp inboxes. Used for account recovery and listing alerts.',
  },
  {
    icon: ShieldCheck,
    title: 'Listing ownership',
    body: 'For listings, we check that the person posting is the rightful owner or authorized lister. Stops the most common scam: someone reposting a listing they have no claim to.',
  },
  {
    icon: Scale,
    title: 'Sanctions & watchlists',
    body: 'Hosts running high-trust listings pass a background screen through Certn — sanctions, sex-offender registry, and global watchlists.',
  },
]

const FAQS = [
  {
    q: 'Is verification required?',
    a: 'No. You can browse, match, and message without verifying. Verified members get a trust badge and reach more people — so most active users opt in.',
  },
  {
    q: 'Who pays for verification?',
    a: 'NestMatch covers basic identity verification. Hosts pay a small fee for the deeper Certn background screen, which is required to display the "Trusted Host" badge.',
  },
  {
    q: 'What data do you store?',
    a: 'We store the pass/fail result, a verification timestamp, and a Persona reference ID. We do NOT store your ID document, photos, or biometric data on our servers — those stay with Persona under their SOC 2 controls.',
  },
  {
    q: 'Can I see who else is verified?',
    a: 'Yes — every member and listing shows their verification status as a badge. Use the "Verified only" filter on a city page to narrow your search.',
  },
]

export default function HowVerificationWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      <main className="pt-24">
        <section className="max-w-3xl mx-auto px-4 py-12">
          <span className="text-secondary font-bold tracking-widest uppercase text-xs">
            Trust & Safety
          </span>
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-primary mt-3">
            How verification works
          </h1>
          <p className="mt-5 text-lg text-on-surface-variant leading-relaxed">
            NestMatch is built on trust, not hope. Here&apos;s exactly what we
            check, who does the checking, and why we keep verification optional.
          </p>
        </section>

        <section className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-6">
            {CHECKS.map((c) => (
              <article
                key={c.title}
                className="rounded-2xl p-6 bg-surface-container-lowest ring-1 ring-outline-variant/30"
              >
                <div className="w-12 h-12 rounded-xl bg-primary text-on-primary grid place-items-center mb-4">
                  <c.icon className="w-6 h-6" />
                </div>
                <h2 className="font-display text-xl font-bold text-primary mb-2">
                  {c.title}
                </h2>
                <p className="text-on-surface-variant leading-relaxed">
                  {c.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="font-display text-3xl font-bold text-primary mb-6">
            What you get when you verify
          </h2>
          <ul className="space-y-3 text-on-surface-variant">
            {[
              'Trust badge on your profile and listings',
              '"Verified only" filter visibility — reach the renters and hosts who care most',
              'Priority placement in matching results',
              'Access to verified-only group chats and high-trust listings',
            ].map((b) => (
              <li key={b} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="font-display text-3xl font-bold text-primary mb-6">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="text-lg font-semibold text-on-surface mb-2">
                  {f.q}
                </h3>
                <p className="text-on-surface-variant">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 py-12 text-center">
          <h2 className="font-display text-3xl font-bold text-primary mb-4">
            Ready to find your sanctuary?
          </h2>
          <p className="text-on-surface-variant mb-6">
            Browse current listings or create a free profile to get matched.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/c/toronto"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl ring-1 ring-outline-variant/40 text-primary bg-background hover:bg-surface-container-low transition-colors font-semibold"
            >
              Browse listings
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-colors font-semibold"
            >
              Create free profile
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
