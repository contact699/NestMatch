'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { clientLogger } from '@/lib/client-logger'
import {
  ArrowRight,
  Users,
  Scale,
  CheckSquare,
  ChevronDown,
  Sparkles,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  LegalDisclaimer,
  SearchBar,
  CategoryNav,
  FeaturedResourceCard,
} from '@/components/resources'
import { Resource, ResourceCategory } from '@/types/database'

const FEATURED_TOOLS = [
  {
    title: 'Moving Checklist',
    description: '48 essential steps for a stress-free move-in day across provinces.',
    href: '/resources/tools/move-in-checklist',
    icon: CheckSquare,
    prominent: false,
  },
]

const KNOWLEDGE_BASE = [
  {
    title: 'Legal Rights',
    description: 'Know your provincial tenant rights and local bylaws.',
    href: '/resources/guides?category=legal',
    icon: Scale,
  },
  {
    title: 'Roommate Contracts',
    description: 'Downloadable templates for co-living agreements.',
    href: '/resources/agreement',
    icon: Users,
  },
]

const COMMON_QUESTIONS = [
  {
    question: 'How do I verify a landlord\'s identity?',
    answer: 'You can verify a landlord\'s identity by requesting government-issued photo ID, checking property ownership records through your provincial land registry, and confirming their contact information matches public records.',
  },
  {
    question: 'Can a landlord ask for a security deposit?',
    answer: 'Security deposit rules vary by province. In Ontario, landlords can only request a last month\'s rent deposit. In British Columbia, landlords can request up to half a month\'s rent as a security deposit. Check your provincial tenancy act for specifics.',
  },
  {
    question: 'What should be included in a lease?',
    answer: 'A lease should include the names of all tenants, the property address, the term of the lease, rent amount and due date, included utilities, rules about pets and smoking, and the landlord\'s contact information. Provincial standard lease forms are available in most jurisdictions.',
  },
]

export default function ResourcesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<ResourceCategory[]>([])
  const [featuredResources, setFeaturedResources] = useState<Resource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, featuredRes] = await Promise.all([
          fetch('/api/resources/categories'),
          fetch('/api/resources?featured=true&limit=6'),
        ])

        if (categoriesRes.ok) {
          const data = await categoriesRes.json()
          setCategories(data.categories || [])
        }

        if (featuredRes.ok) {
          const data = await featuredRes.json()
          setFeaturedResources(data.resources || [])
        }
      } catch (error) {
        clientLogger.error('Error fetching resources', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/resources/guides?q=${encodeURIComponent(searchQuery)}`
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-on-surface">Resources Hub</h1>
        <p className="mt-2 text-on-surface-variant">
          Your curated guide to navigating the Canadian rental market. Expert advice,
          legal templates, and professional tools for a seamless transition.
        </p>
      </div>

      {/* Navigation */}
      <div className="mb-8">
        <CategoryNav categories={categories} />
      </div>

      {/* Featured Tools */}
      <div className="mb-10">
        <h2 className="text-xl font-display font-semibold text-on-surface mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-secondary" />
          Featured Tools
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {FEATURED_TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`group block rounded-xl p-6 transition-all hover:shadow-md ${
                tool.prominent
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest ghost-border'
              }`}
            >
              <h3 className={`text-xl font-display font-bold mb-2 ${
                tool.prominent ? '' : 'text-on-surface'
              }`}>
                {tool.title}
              </h3>
              <p className={`text-sm mb-4 ${
                tool.prominent ? 'text-on-primary/80' : 'text-on-surface-variant'
              }`}>
                {tool.description}
              </p>
              <div className={`inline-flex items-center gap-1 text-sm font-medium ${
                tool.prominent
                  ? 'text-on-primary'
                  : 'text-secondary group-hover:gap-2 transition-all'
              }`}>
                View Guide
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Featured Articles */}
      {featuredResources.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-display font-semibold text-on-surface mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-secondary" />
            Featured Articles
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {featuredResources.map((resource) => (
              <FeaturedResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </div>
      )}

      {/* Expert Knowledge Base */}
      <div className="mb-10">
        <h2 className="text-xl font-display font-semibold text-on-surface mb-4">
          Expert Knowledge Base
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KNOWLEDGE_BASE.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group block bg-surface-container-lowest ghost-border rounded-xl p-5 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center mb-3">
                <item.icon className="h-5 w-5 text-secondary" />
              </div>
              <h3 className="font-semibold text-on-surface group-hover:text-secondary transition-colors">
                {item.title}
              </h3>
              <p className="text-sm text-on-surface-variant mt-1">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Common Questions */}
      <div className="mb-10">
        <h2 className="text-xl font-display font-semibold text-on-surface mb-4">
          Common Questions
        </h2>
        <div className="space-y-3">
          {COMMON_QUESTIONS.map((faq, index) => (
            <div key={index} className="ghost-border rounded-xl bg-surface-container-lowest overflow-hidden">
              <button
                onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-surface-container-low transition-colors"
              >
                <h3 className="font-medium text-on-surface">{faq.question}</h3>
                <ChevronDown className={`h-5 w-5 text-on-surface-variant flex-shrink-0 transition-transform ${openFAQ === index ? 'rotate-180' : ''}`} />
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

      {/* Need help? card - HONESTY FIX: removed "24/7" and "concierge team" */}
      <div className="bg-secondary-container rounded-xl p-6">
        <h3 className="text-lg font-display font-semibold text-on-surface mb-2">
          Need help?
        </h3>
        <p className="text-on-surface-variant mb-4">
          Our team is available to help with complex legal or relocation issues.
        </p>
        <a href="mailto:support@nestmatch.ca">
          <Button className="bg-secondary text-on-primary hover:bg-secondary/90">
            <Mail className="h-4 w-4 mr-2" />
            Contact Support
          </Button>
        </a>
      </div>

      {/* Legal Disclaimer */}
      <div className="mt-6">
        <LegalDisclaimer variant="footer" />
      </div>
    </div>
  )
}
