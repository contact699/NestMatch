'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { clientLogger } from '@/lib/client-logger'
import { Loader2, HelpCircle, X, Shield, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  SearchBar,
  FAQList,
} from '@/components/resources'
import { FAQ, ResourceCategory } from '@/types/database'

interface FaqClientProps {
  initialFaqs: FAQ[]
  initialCategories: ResourceCategory[]
  initialQuery: string
  initialCategory: string | null
  initialProvince: string | null
}

export function FaqClient({
  initialFaqs,
  initialCategories,
  initialQuery,
  initialCategory,
  initialProvince,
}: FaqClientProps) {
  const router = useRouter()

  const [faqs, setFaqs] = useState<FAQ[]>(initialFaqs)
  const [categories] = useState<ResourceCategory[]>(initialCategories)
  const [isLoading, setIsLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory)
  const [selectedProvince, setSelectedProvince] = useState<string | null>(initialProvince)

  // Track whether any filter has changed from the initial server-rendered state
  const [hasFilterChanged, setHasFilterChanged] = useState(false)

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

  // Only re-fetch when filters actually change after initial render
  useEffect(() => {
    if (!hasFilterChanged) return
    fetchFaqs()
  }, [fetchFaqs, hasFilterChanged])

  // Update URL params when filters change
  useEffect(() => {
    if (!hasFilterChanged) return
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (selectedCategory) params.set('category', selectedCategory)
    if (selectedProvince) params.set('province', selectedProvince)

    const newUrl = params.toString() ? `?${params.toString()}` : '/resources/faq'
    router.replace(newUrl, { scroll: false })
  }, [searchQuery, selectedCategory, selectedProvince, router, hasFilterChanged])

  const handleSearchChange = (value: string) => {
    setHasFilterChanged(true)
    setSearchQuery(value)
  }

  const handleCategoryChange = (id: string | null) => {
    setHasFilterChanged(true)
    setSelectedCategory(id)
  }

  const handleProvinceChange = (value: string | null) => {
    setHasFilterChanged(true)
    setSelectedProvince(value)
  }

  const clearFilters = () => {
    setHasFilterChanged(true)
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

  return (
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
                  onClick={() => handleCategoryChange(cat.id)}
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
              onChange={(e) => handleProvinceChange(e.target.value || null)}
              className="w-full px-3 py-2.5 ghost-border rounded-lg bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-secondary/30 outline-none"
            >
              <option value="">All Provinces</option>
              <option value="ON">Ontario</option>
              <option value="BC">British Columbia</option>
              <option value="QC">Quebec</option>
              <option value="AB">Alberta</option>
            </select>
          </div>

          {/* Still need help? */}
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
              onChange={handleSearchChange}
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
  )
}
