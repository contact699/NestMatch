'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  HelpCircle,
  Mail,
  MessageSquare,
  ShieldCheck,
  CreditCard,
  Users,
  Home,
  Search,
  ChevronDown,
  ArrowRight,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const SUPPORT_EMAIL = 'support@nestmatch.ca'

const QUICK_LINKS = [
  {
    title: 'Find a roommate',
    description: 'Browse compatible roommate profiles and start conversations.',
    href: '/roommates',
    icon: Users,
  },
  {
    title: 'Search listings',
    description: 'Find rental properties across Canada by city, budget, and filters.',
    href: '/search',
    icon: Search,
  },
  {
    title: 'Trust Center',
    description: 'Start an ID, credit, or background check to build trust.',
    href: '/verify',
    icon: ShieldCheck,
  },
  {
    title: 'My Listings',
    description: 'Post a new listing or manage your existing ones.',
    href: '/my-listings',
    icon: Home,
  },
]

const FAQ = [
  {
    question: 'I got an error starting a verification — what do I do?',
    answer:
      'Verifications are processed through Stripe. If you see a connection or payment error, wait a minute and try again. If it keeps happening, email support@nestmatch.ca with your email address and the time of the attempt so we can investigate.',
  },
  {
    question: 'How do I message another user?',
    answer:
      'Open any roommate profile or listing and use the "Message" button. All conversations live under the Messages tab in the top nav.',
  },
  {
    question: 'How does the compatibility score work?',
    answer:
      'Take the lifestyle quiz from your profile. Your answers (sleep schedule, cleanliness, noise, smoking, pets, etc.) are compared against other users to generate a match percentage on each profile.',
  },
  {
    question: 'How do I cancel or refund a verification?',
    answer:
      'Verifications that have already started cannot be cancelled because the background-check provider has been engaged. Email support@nestmatch.ca within 24 hours of payment if you believe a charge was made in error.',
  },
  {
    question: 'I found a bug or something is broken',
    answer:
      'Please email support@nestmatch.ca with a short description and, if possible, a screenshot and the URL where it happened. This helps us reproduce and fix the issue fast.',
  },
]

export default function HelpPage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center">
            <HelpCircle className="h-5 w-5 text-secondary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-on-surface">Help &amp; Support</h1>
        </div>
        <p className="text-on-surface-variant">
          Answers to common questions, quick links to key features, and how to reach our team.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {QUICK_LINKS.map(({ title, description, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group block bg-surface-container-lowest ghost-border rounded-xl p-5 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center mb-3">
              <Icon className="h-5 w-5 text-secondary" />
            </div>
            <h3 className="font-semibold text-on-surface group-hover:text-secondary transition-colors">
              {title}
            </h3>
            <p className="text-sm text-on-surface-variant mt-1">{description}</p>
          </Link>
        ))}
      </div>

      <div className="mb-10">
        <h2 className="text-xl font-display font-semibold text-on-surface mb-4">
          Frequently asked questions
        </h2>
        <div className="space-y-3">
          {FAQ.map((faq, index) => (
            <div
              key={index}
              className="ghost-border rounded-xl bg-surface-container-lowest overflow-hidden"
            >
              <button
                onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-surface-container-low transition-colors"
              >
                <h3 className="font-medium text-on-surface">{faq.question}</h3>
                <ChevronDown
                  className={`h-5 w-5 text-on-surface-variant flex-shrink-0 transition-transform ${
                    openFAQ === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFAQ === index && (
                <div className="px-5 pb-4 ghost-border-t">
                  <p className="pt-3 text-sm text-on-surface-variant">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-secondary-container rounded-xl p-6 mb-6">
        <h3 className="text-lg font-display font-semibold text-on-surface mb-2">
          Still need help?
        </h3>
        <p className="text-on-surface-variant mb-4">
          Our team reads every message. For account, billing, or verification issues, email us
          directly.
        </p>
        {/* Render as <a> so the browser handles the mailto: itself — setting
            window.location.href silently no-ops when no mail handler is
            registered (e.g., a Windows user with no default mail app). */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Real <a> so the browser handles mailto: itself; setting
              window.location.href silently no-ops when the user has no
              default mail handler (e.g., Windows without a mail app set). */}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center justify-center font-medium rounded-lg px-5 py-2.5 text-sm gap-2 bg-secondary text-on-primary hover:bg-secondary/90 transition-colors"
          >
            <Mail className="h-4 w-4" />
            Email Support
          </a>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(SUPPORT_EMAIL)
                toast.success('Email address copied')
              } catch {
                toast.error(`Couldn't copy. Email us at ${SUPPORT_EMAIL}`)
              }
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy address
          </Button>
        </div>
        <p className="text-xs text-on-surface-variant mt-3">
          Or email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline text-secondary">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/resources"
          className="inline-flex items-center gap-1 text-secondary hover:underline"
        >
          Browse the Resource Hub
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <span className="text-on-surface-variant">·</span>
        <Link
          href="/messages"
          className="inline-flex items-center gap-1 text-secondary hover:underline"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Your messages
        </Link>
        <span className="text-on-surface-variant">·</span>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-secondary hover:underline"
        >
          Account settings
        </Link>
      </div>
    </div>
  )
}
