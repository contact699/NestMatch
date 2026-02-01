'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, HelpCircle, Filter, X } from 'lucide-react'
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
  const [showFilters, setShowFilters] = useState(false)

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
      console.error('Error fetching FAQs:', error)
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
      console.error('Error fetching categories:', error)
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HelpCircle className="h-7 w-7 text-green-600" />
          Frequently Asked Questions
        </h1>
        <p className="mt-1 text-gray-600">
          Find answers to common questions about renting, roommates, and living together
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search questions..."
        />
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasFilters && (
              <span className="ml-2 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                {[selectedCategory, selectedProvince].filter(Boolean).length}
              </span>
            )}
          </Button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Clear filters
            </button>
          )}
        </div>

        <div className={`space-y-4 ${showFilters || 'hidden lg:block'}`}>
          <div className="space-y-3">
            <ProvinceFilter
              selected={selectedProvince}
              onChange={setSelectedProvince}
            />
            <CategoryChips
              categories={categories}
              selected={selectedCategory}
              onSelect={(id) => {
                const cat = categories.find((c) => c.id === id)
                setSelectedCategory(cat?.slug || null)
              }}
            />
          </div>
        </div>
      </div>

      {/* Legal Disclaimer */}
      <LegalDisclaimer />

      {/* Results */}
      <div className="mt-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : faqs.length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No FAQs found</h3>
            <p className="text-gray-500 mb-4">
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
            <p className="text-sm text-gray-500 mb-4">
              {faqs.length} question{faqs.length !== 1 ? 's' : ''} found
            </p>
            <FAQList faqs={faqs} />
          </>
        ) : (
          // Show grouped by category when not filtering
          <div className="space-y-8">
            {Object.entries(groupedFaqs).map(([categoryId, categoryFaqs]) => (
              <section key={categoryId}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {getCategoryName(categoryId)}
                </h2>
                <FAQList faqs={categoryFaqs} />
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Submit Question CTA */}
      <div className="mt-12 p-6 bg-gray-50 rounded-xl text-center">
        <HelpCircle className="h-10 w-10 mx-auto text-blue-600 mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Can't find your answer?
        </h3>
        <p className="text-gray-600 mb-4">
          Submit a question and we'll try to answer it or point you in the right direction.
        </p>
        <a href="/resources/submit-question">
          <Button>Submit a Question</Button>
        </a>
      </div>
    </div>
    </>
  )
}
