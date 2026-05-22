'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { clientLogger } from '@/lib/client-logger'
import { Loader2, BookOpen, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  LegalDisclaimer,
  SearchBar,
  ProvinceFilter,
  CategoryChips,
  ResourceCard,
} from '@/components/resources'
import { Resource, ResourceCategory } from '@/types/database'

interface GuidesClientProps {
  initialResources: Resource[]
  initialCategories: ResourceCategory[]
  initialQuery: string
  initialCategory: string | null
  initialProvince: string | null
}

export function GuidesClient({
  initialResources,
  initialCategories,
  initialQuery,
  initialCategory,
  initialProvince,
}: GuidesClientProps) {
  const router = useRouter()

  const [resources, setResources] = useState<Resource[]>(initialResources)
  const [categories] = useState<ResourceCategory[]>(initialCategories)
  const [isLoading, setIsLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory)
  const [selectedProvince, setSelectedProvince] = useState<string | null>(initialProvince)

  // Track whether any filter has changed from the initial server-rendered state
  const [hasFilterChanged, setHasFilterChanged] = useState(false)

  const fetchResources = useCallback(async () => {
    setIsLoading(true)

    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (selectedCategory) params.set('category', selectedCategory)
    if (selectedProvince) params.set('province', selectedProvince)

    try {
      const response = await fetch(`/api/resources?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setResources(data.resources || [])
      }
    } catch (error) {
      clientLogger.error('Error fetching resources', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, selectedCategory, selectedProvince])

  // Only re-fetch when filters actually change after initial render
  useEffect(() => {
    if (!hasFilterChanged) return
    fetchResources()
  }, [fetchResources, hasFilterChanged])

  // Update URL params when filters change
  useEffect(() => {
    if (!hasFilterChanged) return
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (selectedCategory) params.set('category', selectedCategory)
    if (selectedProvince) params.set('province', selectedProvince)

    const newUrl = params.toString() ? `?${params.toString()}` : '/resources/guides'
    router.replace(newUrl, { scroll: false })
  }, [searchQuery, selectedCategory, selectedProvince, router, hasFilterChanged])

  const handleSearchChange = (value: string) => {
    setHasFilterChanged(true)
    setSearchQuery(value)
  }

  const handleCategoryChange = (slug: string | null) => {
    setHasFilterChanged(true)
    setSelectedCategory(slug)
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-on-surface flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" />
          Guides & Resources
        </h1>
        <p className="mt-1 text-on-surface-variant">
          Province-specific guides on tenant rights, roommate relationships, and more
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search guides and articles..."
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
              <span className="ml-2 w-5 h-5 rounded-full bg-primary text-on-primary text-xs flex items-center justify-center">
                {[selectedCategory, selectedProvince].filter(Boolean).length}
              </span>
            )}
          </Button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1"
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
              onChange={handleProvinceChange}
            />
            <CategoryChips
              categories={categories}
              selected={selectedCategory}
              onSelect={(id) => {
                const cat = categories.find((c) => c.id === id)
                handleCategoryChange(cat?.slug || null)
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
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-outline mb-4" />
            <h3 className="text-lg font-medium text-on-surface mb-1">No guides found</h3>
            <p className="text-on-surface-variant mb-4">
              {hasFilters
                ? 'Try adjusting your filters or search terms'
                : 'Check back soon for new content'}
            </p>
            {hasFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-on-surface-variant mb-4">
              {resources.length} guide{resources.length !== 1 ? 's' : ''} found
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  showCategory
                  categoryName={
                    categories.find((c) => c.id === resource.category_id)?.name
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
