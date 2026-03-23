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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-on-surface">Agreement Clauses</h1>
          <p className="text-on-surface-variant mt-1">Manage roommate agreement clause templates</p>
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
          <div className="bg-surface-container-lowest rounded-xl ghost-border p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-on-surface-variant/40 mb-4" />
            <p className="text-on-surface-variant">No clauses found</p>
            <Link href="/admin/clauses/new" className="text-primary hover:underline mt-2 inline-block">
              Add your first clause
            </Link>
          </div>
        ) : (
          Object.entries(groupedClauses).map(([category, categoryClauses]) => (
            <div
              key={category}
              className="bg-surface-container-lowest rounded-xl ghost-border overflow-hidden"
            >
              <div className="px-6 py-4 bg-surface-container-low ghost-border border-t-0 border-l-0 border-r-0">
                <h2 className="font-display font-semibold text-on-surface">{formatCategoryName(category)}</h2>
                <p className="text-sm text-on-surface-variant">{categoryClauses.length} clauses</p>
              </div>

              <div className="divide-y divide-outline-variant/15">
                {categoryClauses.map((clause) => (
                  <div
                    key={clause.id}
                    className="px-6 py-4 hover:bg-surface-container-low flex items-start gap-4"
                  >
                    <div className="text-on-surface-variant/40 cursor-grab">
                      <GripVertical className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-on-surface">{clause.title}</p>
                            {clause.is_required && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-error-container text-error">
                                Required
                              </span>
                            )}
                          </div>
                          {clause.description && (
                            <p className="text-sm text-on-surface-variant mt-1 line-clamp-2">
                              {clause.description}
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {clause.provinces.length > 0 ? (
                              clause.provinces.map((province) => (
                                <span
                                  key={province}
                                  className="px-2 py-0.5 text-xs font-medium rounded-full bg-surface-container text-on-surface-variant"
                                >
                                  {province}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-on-surface-variant/60">All provinces</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/clauses/${clause.id}/edit`}
                        className="p-2 text-on-surface-variant hover:text-primary rounded-lg hover:bg-primary/10"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => deleteClause(clause.id)}
                        className="p-2 text-on-surface-variant hover:text-error rounded-lg hover:bg-error/10"
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
