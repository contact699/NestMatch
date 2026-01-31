'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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

export default function GuidesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [resources, setResources] = useState<Resource[]>([])
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
      console.error('Error fetching resources:', error)
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
    fetchResources()
  }, [fetchResources])

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (selectedCategory) params.set('category', selectedCategory)
    if (selectedProvince) params.set('province', selectedProvince)

    const newUrl = params.toString() ? `?${params.toString()}` : '/resources/guides'
    router.replace(newUrl, { scroll: false })
  }, [searchQuery, selectedCategory, selectedProvince, router])

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory(null)
    setSelectedProvince(null)
  }

  const hasFilters = searchQuery || selectedCategory || selectedProvince

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-blue-600" />
          Guides & Resources
        </h1>
        <p className="mt-1 text-gray-600">
          Province-specific guides on tenant rights, roommate relationships, and more
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
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
        ) : resources.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No guides found</h3>
            <p className="text-gray-500 mb-4">
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
            <p className="text-sm text-gray-500 mb-4">
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
