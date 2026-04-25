'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { clientLogger } from '@/lib/client-logger'
import { Loader2, HelpCircle, X, Shield, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  LegalDisclaimer,
  SearchBar,
  ProvinceFilter,
  CategoryChips,
  FAQList,
} from '@/components/resources'
import { FAQ, ResourceCategory } from '@/types/database'

export default function FAQPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [categories, setCategories] = useState<ResourceCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category') || null
  )
  const [selectedProvince, setSelectedProvince] = useState<string | null>(
    searchParams.get('province') || null
  )

  const fetchFaqs = useCallback(async () => {
    setIsLoading(true)

    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (selectedCategory) params.set('category', selectedCategory)
    if (selectedProvince) params.set('province', selectedProvince)

    try {
      const response = await fetch(`/api/resources/faqs?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setFaqs(data.faqs || [])
      }
    } catch (error) {
      clientLogger.error('Error fetching FAQs', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, selectedCategory, selectedProvince])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/resources/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      clientLogger.error('Error fetching categories', error)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchFaqs()
  }, [fetchFaqs])

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (selectedCategory) params.set('category', selectedCategory)
    if (selectedProvince) params.set('province', selectedProvince)

    const newUrl = params.toString() ? `?${params.toString()}` : '/resources/faq'
    router.replace(newUrl, { scroll: false })
  }, [searchQuery, selectedCategory, selectedProvince, router])

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory(null)
    setSelectedProvince(null)
  }

  const hasFilters = searchQuery || selectedCategory || selectedProvince

  // Group FAQs by category
  const groupedFaqs = faqs.reduce((acc, faq) => {
    const categoryId = faq.category_id || 'uncategorized'
    if (!acc[categoryId]) {
      acc[categoryId] = []
    }
    acc[categoryId].push(faq)
    return acc
  }, {} as Record<string, FAQ[]>)

  const getCategoryName = (categoryId: string) => {
    if (categoryId === 'uncategorized') return 'General'
    return categories.find((c) => c.id === categoryId)?.name || 'Other'
  }

  // Generate FAQ schema for structured data (SEO)
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <>
      {/* FAQ structured data for SEO */}
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-on-surface">
            Frequently Asked Questions
          </h1>
          <p className="mt-2 text-on-surface-variant">
            Find answers to common questions about finding your perfect home sanctuary,
            privacy protections, and seamless payments across Canada.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Categories */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
                Categories
              </h3>
              <nav className="space-y-1">
                {[{ id: null, name: 'General' }, ...categories.filter(c => ['privacy', 'payments', 'legal'].includes(c.slug || ''))].map((cat) => (
                  <button
                    key={cat.id || 'general'}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`
                      w-full text-left px-3 py-2 text-sm rounded-lg transition-colors
                      ${selectedCategory === cat.id
                        ? 'bg-secondary-container text-secondary font-medium'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}
                    `}
                  >
                    {cat.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Province filter */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
                Province
              </h3>
              <select
                value={selectedProvince || ''}
                onChange={(e) => setSelectedProvince(e.target.value || null)}
                className="w-full px-3 py-2.5 ghost-border rounded-lg bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-secondary/30 outline-none"
              >
                <option value="">All Provinces</option>
                <option value="ON">Ontario</option>
                <option value="BC">British Columbia</option>
                <option value="QC">Quebec</option>
                <option value="AB">Alberta</option>
              </select>
            </div>

            {/* Still need help? - HONESTY FIX: removed "24/7" claim */}
            <div className="bg-secondary-container rounded-xl p-5">
              <h3 className="font-semibold text-on-surface mb-1">Still need help?</h3>
              <p className="text-sm text-on-surface-variant mb-3">
                Our team is available to assist with your search.
              </p>
              <Button
                type="button"
                size="sm"
                className="w-full bg-secondary text-on-primary hover:bg-secondary/90"
                onClick={() => { window.location.href = 'mailto:support@nestmatch.ca' }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
              <p className="text-xs text-on-surface-variant mt-2 text-center">
                <a href="mailto:support@nestmatch.ca" className="underline">
                  support@nestmatch.ca
                </a>
              </p>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            {/* Search */}
            <div className="mb-6">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search questions, keywords, or topics..."
              />
            </div>

            {hasFilters && (
              <div className="mb-4 flex items-center gap-2">
                <button
                  onClick={clearFilters}
                  className="text-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Clear filters
                </button>
              </div>
            )}

            {/* Results */}
            <div>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-secondary" />
                </div>
              ) : faqs.length === 0 ? (
                <div className="text-center py-12">
                  <HelpCircle className="h-12 w-12 mx-auto text-on-surface-variant/30 mb-4" />
                  <h3 className="text-lg font-display font-medium text-on-surface mb-1">No FAQs found</h3>
                  <p className="text-on-surface-variant mb-4">
                    {hasFilters
                      ? 'Try adjusting your filters or search terms'
                      : 'Check back soon for answers to common questions'}
                  </p>
                  {hasFilters && (
                    <Button variant="outline" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : searchQuery || selectedCategory || selectedProvince ? (
                // Show flat list when filtering
                <>
                  <p className="text-sm text-on-surface-variant mb-4">
                    {faqs.length} question{faqs.length !== 1 ? 's' : ''} found
                  </p>
                  <FAQList faqs={faqs} />
                </>
              ) : (
                // Show grouped by category when not filtering
                <div className="space-y-8">
                  {Object.entries(groupedFaqs).map(([categoryId, categoryFaqs]) => (
                    <section key={categoryId}>
                      <h2 className="text-lg font-display font-semibold text-on-surface mb-4">
                        {getCategoryName(categoryId)}
                      </h2>
                      <FAQList faqs={categoryFaqs} />
                    </section>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom cards */}
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* REMOVED "Verified Rent Guarantee" card - escrow feature doesn't exist */}

              {/* Security Standards card */}
              <div className="bg-secondary-container rounded-xl p-6 sm:col-span-2">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-on-surface">Security Standards</h3>
                    <p className="text-sm text-on-surface-variant mt-1">
                      How we protect your data with bank-grade AES-256 encryption.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
