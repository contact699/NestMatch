'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, X, Loader2, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { FAQ, ResourceCategory } from '@/types/database'

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

interface FAQFormProps {
  faq?: FAQ
  isEditing?: boolean
}

export function FAQForm({ faq, isEditing = false }: FAQFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<ResourceCategory[]>([])

  const [formData, setFormData] = useState({
    question: faq?.question || '',
    answer: faq?.answer || '',
    category_id: faq?.category_id || '',
    provinces: faq?.provinces || [],
    tags: faq?.tags || [],
    display_order: faq?.display_order ?? 0,
    is_published: faq?.is_published ?? false,
    publish_at: faq?.publish_at || '',
    unpublish_at: faq?.unpublish_at || '',
  })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    const faqData = {
      ...formData,
      category_id: formData.category_id || null,
      publish_at: formData.publish_at || null,
      unpublish_at: formData.unpublish_at || null,
    }

    try {
      if (isEditing && faq) {
        const { error } = await (supabase as any)
          .from('faqs')
          .update(faqData)
          .eq('id', faq.id)

        if (error) throw error
      } else {
        const { error } = await (supabase as any).from('faqs').insert(faqData)

        if (error) throw error
      }

      router.push('/admin/faqs')
    } catch (error) {
      console.error('Error saving FAQ:', error)
      alert('Failed to save FAQ')
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
            onClick={() => router.push('/admin/faqs')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit FAQ' : 'New FAQ'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditing ? 'Update this FAQ' : 'Add a new frequently asked question'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/faqs')}>
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
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Question & Answer</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question *
                </label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) =>
                    setFormData({ ...formData, question: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Can my landlord enter my room without notice?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Answer *
                </label>
                <textarea
                  value={formData.answer}
                  onChange={(e) =>
                    setFormData({ ...formData, answer: e.target.value })
                  }
                  required
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Provide a clear, helpful answer..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supports basic formatting. Keep answers concise but thorough.
                </p>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower numbers appear first
                </p>
              </div>

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

          {/* Category */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Category</h2>

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
