'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Edit2,
  Trash2,
  FolderOpen,
  Loader2,
  GripVertical,
  Check,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ResourceCategory } from '@/types/database'

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<ResourceCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', icon: '' })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('resource_categories')
      .select('*')
      .order('display_order')

    setCategories(data || [])
    setIsLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    const supabase = createClient()
    const { error } = await (supabase as any).from('resource_categories').delete().eq('id', id)

    if (!error) {
      setCategories(categories.filter((c) => c.id !== id))
    }
  }

  const toggleActive = async (category: ResourceCategory) => {
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('resource_categories')
      .update({ is_active: !category.is_active })
      .eq('id', category.id)

    if (!error) {
      setCategories(
        categories.map((c) =>
          c.id === category.id ? { ...c, is_active: !c.is_active } : c
        )
      )
    }
  }

  const startEditing = (category: ResourceCategory) => {
    setEditingId(category.id)
    setEditForm({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm({ name: '', description: '', icon: '' })
  }

  const saveEdit = async (id: string) => {
    const supabase = createClient()
    const { error } = await (supabase as any)
      .from('resource_categories')
      .update({
        name: editForm.name,
        description: editForm.description || null,
        icon: editForm.icon || null,
      })
      .eq('id', id)

    if (!error) {
      setCategories(
        categories.map((c) =>
          c.id === id
            ? { ...c, name: editForm.name, description: editForm.description, icon: editForm.icon }
            : c
        )
      )
      setEditingId(null)
    }
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600 mt-1">Organize resources and FAQs into categories</p>
        </div>
        <Link href="/admin/categories/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-10"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <FolderOpen className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p>No categories yet</p>
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="pl-4 text-gray-300 cursor-grab">
                    <GripVertical className="h-5 w-5" />
                  </td>
                  <td className="px-6 py-4">
                    {editingId === category.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Name"
                        />
                        <input
                          type="text"
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm({ ...editForm, description: e.target.value })
                          }
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Description"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          {category.icon ? (
                            <span className="text-lg">{category.icon}</span>
                          ) : (
                            <FolderOpen className="h-5 w-5 text-purple-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {category.name}
                          </p>
                          {category.description && (
                            <p className="text-xs text-gray-500">{category.description}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm text-gray-500">{category.slug}</code>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActive(category)}
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        category.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {category.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{category.display_order}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === category.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(category.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(category)}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
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
