'use client'

import { useEffect, useState, use } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ClauseForm } from '@/components/admin/clause-form'
import { AgreementClause } from '@/types/database'

export default function EditClausePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [clause, setClause] = useState<AgreementClause | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchClause = async () => {
      const supabase = createClient()
      const { data } = await (supabase as any)
        .from('agreement_clauses')
        .select('*')
        .eq('id', id)
        .single()

      setClause(data)
      setIsLoading(false)
    }

    fetchClause()
  }, [id])

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!clause) {
    return <div className="text-center py-16">Clause not found</div>
  }

  return <ClauseForm clause={clause} isEditing />
}
