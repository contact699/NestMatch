'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { clientLogger } from '@/lib/client-logger'
import { Save, Loader2, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Database } from '@/types/database'

type CategoryInsert = Database['public']['Tables']['resource_categories']['Insert']

const ICONS = ['📚', '⚖️', '👥', '💰', '🏠', '🔒', '📋', '💡', '🛡️', '❓']

export default function NewCategoryPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
    display_order: 0,
    is_active: true,
  })

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    try {
      const insertData: CategoryInsert = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        icon: formData.icon || null,
        display_order: formData.display_order,
        is_active: formData.is_active,
      }

      const { error } = await supabase.from('resource_categories').insert(insertData)

      if (error) throw error

      router.push('/admin/categories')
    } catch (error) {
      clientLogger.error('Error creating category', error)
      alert('Failed to create category')
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
            onClick={() => router.push('/admin/categories')}
            className="p-2 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold text-on-surface">New Category</h1>
            <p className="text-on-surface-variant mt-1">Create a new category for resources and FAQs</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/categories')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="bg-surface-container-lowest rounded-xl ghost-border p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              className="w-full px-4 py-2 ghost-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
              placeholder="e.g., Legal Questions"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              Slug *
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              required
              className="w-full px-4 py-2 ghost-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
              placeholder="legal-questions"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 ghost-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
              placeholder="A brief description of this category"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      icon: formData.icon === icon ? '' : icon,
                    })
                  }
                  className={`w-10 h-10 text-xl rounded-lg border-2 transition-colors ${
                    formData.icon === icon
                      ? 'border-primary bg-primary/10'
                      : 'border-outline-variant/15 hover:border-outline-variant/30'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
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
                className="w-full px-4 py-2 ghost-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
              />
              <p className="text-xs text-on-surface-variant mt-1">Lower numbers appear first</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                Status
              </label>
              <label className="flex items-center gap-3 mt-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-outline-variant/30"
                />
                <span className="text-sm text-on-surface">Active</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
