'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  BookOpen,
  Loader2,
  MoreHorizontal,
  Star,
  ThumbsUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Resource, ResourceCategory } from '@/types/database'

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [categories, setCategories] = useState<ResourceCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterPublished, setFilterPublished] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()

    const [resourcesRes, categoriesRes] = await Promise.all([
      supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('resource_categories')
        .select('*')
        .order('display_order'),
    ])

    setResources(resourcesRes.data || [])
    setCategories(categoriesRes.data || [])
    setIsLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return

    const supabase = createClient()
    const { error } = await (supabase as any).from('resources').delete().eq('id', id)

    if (!error) {
      setResources(resources.filter((r) => r.id !== id))
    }
  }

  const togglePublished = async (resource: Resource) => {
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('resources')
      .update({ is_published: !resource.is_published })
      .eq('id', resource.id)

    if (!error) {
      setResources(
        resources.map((r) =>
          r.id === resource.id ? { ...r, is_published: !r.is_published } : r
        )
      )
    }
  }

  const toggleFeatured = async (resource: Resource) => {
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('resources')
      .update({ featured: !resource.featured })
      .eq('id', resource.id)

    if (!error) {
      setResources(
        resources.map((r) =>
          r.id === resource.id ? { ...r, featured: !r.featured } : r
        )
      )
    }
  }

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized'
    return categories.find((c) => c.id === categoryId)?.name || 'Unknown'
  }

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.slug.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !filterCategory || resource.category_id === filterCategory
    const matchesPublished =
      !filterPublished ||
      (filterPublished === 'published' && resource.is_published) ||
      (filterPublished === 'draft' && !resource.is_published)

    return matchesSearch && matchesCategory && matchesPublished
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
          <p className="text-gray-600 mt-1">Manage guides, articles, and other resources</p>
        </div>
        <Link href="/admin/resources/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Resource
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={filterPublished}
            onChange={(e) => setFilterPublished(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Resources Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resource
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stats
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredResources.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <BookOpen className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p>No resources found</p>
                </td>
              </tr>
            ) : (
              filteredResources.map((resource) => (
                <tr key={resource.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {resource.title}
                          </p>
                          {resource.featured && (
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {resource.resource_type} • /{resource.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {getCategoryName(resource.category_id)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => togglePublished(resource)}
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        resource.is_published
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {resource.is_published ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {resource.view_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3.5 w-3.5" />
                        {resource.helpful_count}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleFeatured(resource)}
                        className={`p-2 rounded-lg transition-colors ${
                          resource.featured
                            ? 'text-amber-600 bg-amber-50'
                            : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                        }`}
                        title={resource.featured ? 'Remove from featured' : 'Add to featured'}
                      >
                        <Star className={`h-4 w-4 ${resource.featured ? 'fill-current' : ''}`} />
                      </button>
                      <Link
                        href={`/resources/guides/${resource.slug}`}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        title="View"
                        target="_blank"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/admin/resources/${resource.id}/edit`}
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(resource.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
