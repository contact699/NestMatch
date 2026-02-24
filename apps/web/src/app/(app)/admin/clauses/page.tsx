'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, FileText, Loader2, Pencil, Trash2, GripVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/modal'
import { AgreementClause } from '@/types/database'
import { toast } from 'sonner'

export default function AdminClausesPage() {
  const [clauses, setClauses] = useState<AgreementClause[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [confirmModal, setConfirmModal] = useState<{open: boolean; title: string; message: string; onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}})

  useEffect(() => {
    fetchClauses()
  }, [])

  const fetchClauses = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('agreement_clauses')
      .select('*')
      .order('category')
      .order('display_order')

    setClauses(data || [])
    setIsLoading(false)
  }

  const deleteClause = (id: string) => {
    setConfirmModal({
      open: true,
      title: 'Delete Clause',
      message: 'Are you sure you want to delete this clause?',
      onConfirm: async () => {
        const supabase = createClient()
        const { error } = await supabase.from('agreement_clauses').delete().eq('id', id)

        if (!error) {
          setClauses(clauses.filter((c) => c.id !== id))
          toast.success('Clause deleted successfully')
        } else {
          toast.error('Failed to delete clause')
        }
        setConfirmModal(prev => ({ ...prev, open: false }))
      },
    })
  }

  const groupedClauses = clauses.reduce((acc, clause) => {
    const cat = clause.category || 'uncategorized'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(clause)
    return acc
  }, {} as Record<string, AgreementClause[]>)

  const formatCategoryName = (category: string) => {
    if (category === 'uncategorized') return 'Uncategorized'
    return category
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
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
          <h1 className="text-2xl font-bold text-gray-900">Agreement Clauses</h1>
          <p className="text-gray-600 mt-1">Manage roommate agreement clause templates</p>
        </div>
        <Link href="/admin/clauses/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Clause
          </Button>
        </Link>
      </div>

      {/* Clauses grouped by category */}
      <div className="space-y-6">
        {Object.entries(groupedClauses).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No clauses found</p>
            <Link href="/admin/clauses/new" className="text-blue-600 hover:underline mt-2 inline-block">
              Add your first clause
            </Link>
          </div>
        ) : (
          Object.entries(groupedClauses).map(([category, categoryClauses]) => (
            <div
              key={category}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">{formatCategoryName(category)}</h2>
                <p className="text-sm text-gray-500">{categoryClauses.length} clauses</p>
              </div>

              <div className="divide-y divide-gray-100">
                {categoryClauses.map((clause) => (
                  <div
                    key={clause.id}
                    className="px-6 py-4 hover:bg-gray-50 flex items-start gap-4"
                  >
                    <div className="text-gray-300 cursor-grab">
                      <GripVertical className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{clause.title}</p>
                            {clause.is_required && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                                Required
                              </span>
                            )}
                          </div>
                          {clause.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {clause.description}
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {clause.provinces.length > 0 ? (
                              clause.provinces.map((province) => (
                                <span
                                  key={province}
                                  className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600"
                                >
                                  {province}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">All provinces</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/clauses/${clause.id}/edit`}
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => deleteClause(clause.id)}
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
