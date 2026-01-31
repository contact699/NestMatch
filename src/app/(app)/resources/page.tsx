'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  HelpCircle,
  Wrench,
  Scale,
  ArrowRight,
  Shield,
  Users,
  DollarSign,
  Truck,
  Search,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  LegalDisclaimer,
  ResourceCard,
  FeaturedResourceCard,
  SearchBar,
  CategoryNav,
} from '@/components/resources'
import { Resource, ResourceCategory } from '@/types/database'

const QUICK_LINKS = [
  {
    title: 'Guides & Articles',
    description: 'Learn about tenant rights, roommate relationships, and more',
    href: '/resources/guides',
    icon: BookOpen,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    title: 'FAQ',
    description: 'Find answers to common questions about renting and roommates',
    href: '/resources/faq',
    icon: HelpCircle,
    color: 'bg-green-50 text-green-600',
  },
  {
    title: 'Tools',
    description: 'Rent calculator, move-in checklist, and more helpful tools',
    href: '/resources/tools',
    icon: Wrench,
    color: 'bg-purple-50 text-purple-600',
  },
  {
    title: 'Agreement Generator',
    description: 'Create a customized roommate agreement for your situation',
    href: '/resources/agreement',
    icon: Scale,
    color: 'bg-amber-50 text-amber-600',
  },
]

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  legal: Scale,
  roommates: Users,
  finances: DollarSign,
  moving: Truck,
  safety: Shield,
}

export default function ResourcesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [featuredResource, setFeaturedResource] = useState<Resource | null>(null)
  const [recentResources, setRecentResources] = useState<Resource[]>([])
  const [categories, setCategories] = useState<ResourceCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resourcesRes, categoriesRes] = await Promise.all([
          fetch('/api/resources?limit=5'),
          fetch('/api/resources/categories'),
        ])

        if (resourcesRes.ok) {
          const data = await resourcesRes.json()
          const featured = data.resources?.find((r: Resource) => r.featured)
          setFeaturedResource(featured || data.resources?.[0] || null)
          setRecentResources(data.resources?.slice(0, 4) || [])
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json()
          setCategories(data.categories || [])
        }
      } catch (error) {
        console.error('Error fetching resources:', error)
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
        <h1 className="text-3xl font-bold text-gray-900">Resource Center</h1>
        <p className="mt-2 text-gray-600">
          Everything you need to know about renting, roommates, and living together
        </p>
      </div>

      {/* Navigation */}
      <div className="mb-8">
        <CategoryNav categories={categories} />
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative max-w-2xl">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search guides, FAQs, and resources..."
          />
        </div>
      </form>

      {/* Legal Disclaimer */}
      <LegalDisclaimer variant="banner" />

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group block bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className={`w-12 h-12 rounded-xl ${link.color} flex items-center justify-center mb-4`}>
              <link.icon className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {link.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{link.description}</p>
            <div className="flex items-center gap-1 mt-3 text-sm text-blue-600 font-medium">
              <span>Explore</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* Featured Resource */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : featuredResource ? (
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Featured</h2>
          <FeaturedResourceCard resource={featuredResource} />
        </div>
      ) : null}

      {/* Browse by Category */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Browse by Category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category.slug] || BookOpen
            return (
              <Link
                key={category.id}
                href={`/resources/guides?category=${category.slug}`}
                className="group flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                  <Icon className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="text-sm text-gray-500 truncate">{category.description}</p>
                  )}
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Resources */}
      {recentResources.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recently Added</h2>
            <Link
              href="/resources/guides"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentResources.slice(0, 4).map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </div>
      )}

      {/* Have a Question? */}
      <Card variant="bordered" className="bg-gray-50">
        <CardContent className="py-8 text-center">
          <HelpCircle className="h-12 w-12 mx-auto text-blue-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Can't find what you're looking for?
          </h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            Submit a question and we'll add it to our FAQ or point you in the right direction.
          </p>
          <Link href="/resources/submit-question">
            <Button>Submit a Question</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
