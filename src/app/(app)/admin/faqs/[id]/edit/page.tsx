'use client'

import { useEffect, useState, use } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FAQForm } from '@/components/admin/faq-form'
import { FAQ } from '@/types/database'

export default function EditFAQPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [faq, setFaq] = useState<FAQ | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchFaq = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('faqs')
        .select('*')
        .eq('id', id)
        .single()

      setFaq(data)
      setIsLoading(false)
    }

    fetchFaq()
  }, [id])

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!faq) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600">FAQ not found</p>
      </div>
    )
  }

  return <FAQForm faq={faq} isEditing />
}
