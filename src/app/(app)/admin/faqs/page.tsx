'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  HelpCircle,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  GripVertical,
  Eye,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/modal'
import { FAQ, ResourceCategory } from '@/types/database'
import { toast } from 'sonner'

export default function AdminFAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [categories, setCategories] = useState<ResourceCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterPublished, setFilterPublished] = useState<string>('')
  const [confirmModal, setConfirmModal] = useState<{open: boolean; title: string; message: string; onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}})

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()

    const [faqsRes, categoriesRes] = await Promise.all([
      supabase.from('faqs').select('*').order('display_order'),
      supabase.from('resource_categories').select('*').order('display_order'),
    ])

    setFaqs(faqsRes.data || [])
    setCategories(categoriesRes.data || [])
    setIsLoading(false)
  }

  const handleDelete = (id: string) => {
    setConfirmModal({
      open: true,
      title: 'Delete FAQ',
      message: 'Are you sure you want to delete this FAQ?',
      onConfirm: async () => {
        const supabase = createClient()
        const { error } = await supabase.from('faqs').delete().eq('id', id)

        if (!error) {
          setFaqs(faqs.filter((f) => f.id !== id))
          toast.success('FAQ deleted successfully')
        } else {
          toast.error('Failed to delete FAQ')
        }
        setConfirmModal(prev => ({ ...prev, open: false }))
      },
    })
  }

  const togglePublished = async (faq: FAQ) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('faqs')
      .update({ is_published: !faq.is_published })
      .eq('id', faq.id)

    if (!error) {
      setFaqs(
        faqs.map((f) =>
          f.id === faq.id ? { ...f, is_published: !f.is_published } : f
        )
      )
      toast.success(`FAQ ${!faq.is_published ? 'published' : 'unpublished'}`)
    } else {
      toast.error('Failed to update FAQ status')
    }
  }

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized'
    return categories.find((c) => c.id === categoryId)?.name || 'Unknown'
  }

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !filterCategory || faq.category_id === filterCategory
    const matchesPublished =
      !filterPublished ||
      (filterPublished === 'published' && faq.is_published) ||
      (filterPublished === 'draft' && !faq.is_published)

    return matchesSearch && matchesCategory && matchesPublished
  })

  // Group by category for display
  const groupedFaqs = filteredFaqs.reduce((acc, faq) => {
    const categoryId = faq.category_id || 'uncategorized'
    if (!acc[categoryId]) {
      acc[categoryId] = []
    }
    acc[categoryId].push(faq)
    return acc
  }, {} as Record<string, FAQ[]>)

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
          <h1 className="text-2xl font-bold text-gray-900">FAQs</h1>
          <p className="text-gray-600 mt-1">Manage frequently asked questions</p>
        </div>
        <Link href="/admin/faqs/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add FAQ
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
                placeholder="Search FAQs..."
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

      {/* FAQs grouped by category */}
      <div className="space-y-6">
        {Object.entries(groupedFaqs).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <HelpCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No FAQs found</p>
          </div>
        ) : (
          Object.entries(groupedFaqs).map(([categoryId, categoryFaqs]) => (
            <div
              key={categoryId}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">
                  {getCategoryName(categoryId === 'uncategorized' ? null : categoryId)}
                </h2>
                <p className="text-sm text-gray-500">{categoryFaqs.length} questions</p>
              </div>

              <div className="divide-y divide-gray-100">
                {categoryFaqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="px-6 py-4 hover:bg-gray-50 flex items-start gap-4"
                  >
                    <div className="text-gray-300 cursor-grab">
                      <GripVertical className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <HelpCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {faq.question}
                          </p>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {faq.answer}
                          </p>

                          <div className="flex items-center gap-4 mt-2">
                            {faq.provinces.length > 0 && (
                              <span className="text-xs text-gray-500">
                                {faq.provinces.join(', ')}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <ThumbsUp className="h-3 w-3" />
                              {faq.helpful_count}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <ThumbsDown className="h-3 w-3" />
                              {faq.not_helpful_count}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePublished(faq)}
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          faq.is_published
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {faq.is_published ? 'Published' : 'Draft'}
                      </button>
                      <Link
                        href={`/admin/faqs/${faq.id}/edit`}
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(faq.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}
