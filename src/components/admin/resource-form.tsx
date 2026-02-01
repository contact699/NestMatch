'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Save,
  X,
  Plus,
  Loader2,
  BookOpen,
  Eye,
  ArrowLeft,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Resource, ResourceCategory } from '@/types/database'

const PROVINCES = [
  { code: 'ON', name: 'Ontario' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'QC', name: 'Quebec' },
  { code: 'AB', name: 'Alberta' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland' },
  { code: 'PE', name: 'PEI' },
]

const RESOURCE_TYPES = ['guide', 'article', 'checklist', 'template']

interface ContentBlock {
  type: 'heading' | 'paragraph' | 'list' | 'callout' | 'quote'
  level?: number
  text?: string
  items?: string[]
  variant?: 'info' | 'warning' | 'tip'
}

interface ResourceFormProps {
  resource?: Resource
  isEditing?: boolean
}

export function ResourceForm({ resource, isEditing = false }: ResourceFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<ResourceCategory[]>([])

  const [formData, setFormData] = useState({
    title: resource?.title || '',
    slug: resource?.slug || '',
    subtitle: resource?.subtitle || '',
    excerpt: resource?.excerpt || '',
    category_id: resource?.category_id || '',
    resource_type: resource?.resource_type || 'guide',
    provinces: resource?.provinces || [],
    tags: resource?.tags || [],
    is_published: resource?.is_published ?? false,
    featured: resource?.featured ?? false,
    publish_at: resource?.publish_at || '',
    unpublish_at: resource?.unpublish_at || '',
  })

  const [content, setContent] = useState<ContentBlock[]>(
    (resource?.content as unknown as ContentBlock[]) || [
      { type: 'paragraph', text: '' },
    ]
  )

  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    const fetchCategories = async () => {
      const supabase = createClient()
      const { data } = await (supabase as any)
        .from('resource_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      setCategories(data || [])
    }

    fetchCategories()
  }, [])

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: isEditing ? prev.slug : generateSlug(title),
    }))
  }

  const toggleProvince = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      provinces: prev.provinces.includes(code)
        ? prev.provinces.filter((p) => p !== code)
        : [...prev.provinces, code],
    }))
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }))
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }))
  }

  const addContentBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = { type }
    if (type === 'heading') {
      newBlock.level = 2
      newBlock.text = ''
    } else if (type === 'paragraph' || type === 'quote') {
      newBlock.text = ''
    } else if (type === 'list') {
      newBlock.items = ['']
    } else if (type === 'callout') {
      newBlock.variant = 'info'
      newBlock.text = ''
    }
    setContent([...content, newBlock])
  }

  const updateContentBlock = (index: number, updates: Partial<ContentBlock>) => {
    setContent(
      content.map((block, i) => (i === index ? { ...block, ...updates } : block))
    )
  }

  const removeContentBlock = (index: number) => {
    setContent(content.filter((_, i) => i !== index))
  }

  const addListItem = (blockIndex: number) => {
    setContent(
      content.map((block, i) =>
        i === blockIndex && block.items
          ? { ...block, items: [...block.items, ''] }
          : block
      )
    )
  }

  const updateListItem = (blockIndex: number, itemIndex: number, value: string) => {
    setContent(
      content.map((block, i) =>
        i === blockIndex && block.items
          ? {
              ...block,
              items: block.items.map((item, j) => (j === itemIndex ? value : item)),
            }
          : block
      )
    )
  }

  const removeListItem = (blockIndex: number, itemIndex: number) => {
    setContent(
      content.map((block, i) =>
        i === blockIndex && block.items
          ? { ...block, items: block.items.filter((_, j) => j !== itemIndex) }
          : block
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    const resourceData = {
      ...formData,
      content,
      category_id: formData.category_id || null,
      publish_at: formData.publish_at || null,
      unpublish_at: formData.unpublish_at || null,
    }

    try {
      if (isEditing && resource) {
        const { error } = await (supabase as any)
          .from('resources')
          .update(resourceData)
          .eq('id', resource.id)

        if (error) throw error
      } else {
        const { error } = await (supabase as any).from('resources').insert(resourceData)

        if (error) throw error
      }

      router.push('/admin/resources')
    } catch (error) {
      console.error('Error saving resource:', error)
      alert('Failed to save resource')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/admin/resources')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Resource' : 'New Resource'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditing ? 'Update resource details and content' : 'Create a new guide, article, or resource'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/resources')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Update' : 'Create'}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Ontario Tenant Rights Guide"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">/resources/guides/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    required
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ontario-tenant-rights"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) =>
                    setFormData({ ...formData, subtitle: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="A brief subtitle or tagline"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Excerpt
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) =>
                    setFormData({ ...formData, excerpt: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="A short description for search results and cards"
                />
              </div>
            </div>
          </div>

          {/* Content Blocks */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Content</h2>

            <div className="space-y-4">
              {content.map((block, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {block.type}
                      {block.type === 'heading' && ` (H${block.level})`}
                      {block.type === 'callout' && ` - ${block.variant}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeContentBlock(index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {block.type === 'heading' && (
                    <div className="space-y-2">
                      <select
                        value={block.level}
                        onChange={(e) =>
                          updateContentBlock(index, { level: Number(e.target.value) })
                        }
                        className="px-3 py-1 text-sm border border-gray-200 rounded-lg"
                      >
                        <option value={2}>H2</option>
                        <option value={3}>H3</option>
                      </select>
                      <input
                        type="text"
                        value={block.text}
                        onChange={(e) =>
                          updateContentBlock(index, { text: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                        placeholder="Heading text"
                      />
                    </div>
                  )}

                  {(block.type === 'paragraph' || block.type === 'quote') && (
                    <textarea
                      value={block.text}
                      onChange={(e) =>
                        updateContentBlock(index, { text: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                      placeholder={block.type === 'quote' ? 'Quote text' : 'Paragraph text'}
                    />
                  )}

                  {block.type === 'callout' && (
                    <div className="space-y-2">
                      <select
                        value={block.variant}
                        onChange={(e) =>
                          updateContentBlock(index, {
                            variant: e.target.value as 'info' | 'warning' | 'tip',
                          })
                        }
                        className="px-3 py-1 text-sm border border-gray-200 rounded-lg"
                      >
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="tip">Tip</option>
                      </select>
                      <textarea
                        value={block.text}
                        onChange={(e) =>
                          updateContentBlock(index, { text: e.target.value })
                        }
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                        placeholder="Callout text"
                      />
                    </div>
                  )}

                  {block.type === 'list' && (
                    <div className="space-y-2">
                      {block.items?.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center gap-2">
                          <span className="text-gray-400">•</span>
                          <input
                            type="text"
                            value={item}
                            onChange={(e) =>
                              updateListItem(index, itemIndex, e.target.value)
                            }
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg"
                            placeholder="List item"
                          />
                          <button
                            type="button"
                            onClick={() => removeListItem(index, itemIndex)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addListItem(index)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Add item
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Add Content Block */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => addContentBlock('heading')}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  + Heading
                </button>
                <button
                  type="button"
                  onClick={() => addContentBlock('paragraph')}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  + Paragraph
                </button>
                <button
                  type="button"
                  onClick={() => addContentBlock('list')}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  + List
                </button>
                <button
                  type="button"
                  onClick={() => addContentBlock('callout')}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  + Callout
                </button>
                <button
                  type="button"
                  onClick={() => addContentBlock('quote')}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  + Quote
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>

            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) =>
                    setFormData({ ...formData, is_published: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Published</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) =>
                    setFormData({ ...formData, featured: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Featured</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Publish At
                </label>
                <input
                  type="datetime-local"
                  value={formData.publish_at || ''}
                  onChange={(e) => setFormData({ ...formData, publish_at: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Schedule automatic publishing
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unpublish At
                </label>
                <input
                  type="datetime-local"
                  value={formData.unpublish_at || ''}
                  onChange={(e) => setFormData({ ...formData, unpublish_at: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Schedule automatic unpublishing
                </p>
              </div>
            </div>
          </div>

          {/* Organization */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.resource_type}
                  onChange={(e) =>
                    setFormData({ ...formData, resource_type: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {RESOURCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Provinces */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Provinces</h2>

            <div className="flex flex-wrap gap-2">
              {PROVINCES.map((province) => (
                <button
                  key={province.code}
                  type="button"
                  onClick={() => toggleProvince(province.code)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    formData.provinces.includes(province.code)
                      ? 'bg-blue-100 border-blue-200 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {province.code}
                </button>
              ))}
            </div>
            {formData.provinces.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Leave empty for all provinces
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>

            <div className="flex flex-wrap gap-2 mb-3">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add tag"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
