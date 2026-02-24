'use client'

import { useEffect, useState, use } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ResourceForm } from '@/components/admin/resource-form'
import { Resource } from '@/types/database'

export default function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [resource, setResource] = useState<Resource | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchResource = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('resources')
        .select('*')
        .eq('id', id)
        .single()

      setResource(data)
      setIsLoading(false)
    }

    fetchResource()
  }, [id])

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!resource) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600">Resource not found</p>
      </div>
    )
  }

  return <ResourceForm resource={resource} isEditing />
}
