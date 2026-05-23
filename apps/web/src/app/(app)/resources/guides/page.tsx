import { createClient } from '@/lib/supabase/server'
import { GuidesClient } from './guides-client'

export const metadata = {
  title: 'Resources & Guides for Renters in Canada',
  description:
    'Browse NestMatch guides on finding a roommate, tenant rights, rental scams, and more — Canada-specific advice for renters.',
  alternates: { canonical: 'https://www.nestmatch.app/resources/guides' },
}

export default async function GuidesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; province?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const now = new Date().toISOString()

  // Resolve category slug → id before building the main query
  let categoryId: string | null = null
  if (params.category) {
    const { data: categoryData } = await supabase
      .from('resource_categories')
      .select('id')
      .eq('slug', params.category)
      .single()
    categoryId = categoryData?.id ?? null
  }

  let resourcesQuery = supabase
    .from('resources')
    .select('*')
    .eq('is_published', true)
    .or(`publish_at.is.null,publish_at.lte.${now}`)
    .or(`unpublish_at.is.null,unpublish_at.gt.${now}`)

  if (params.q) {
    resourcesQuery = resourcesQuery.textSearch('search_vector', params.q, {
      type: 'websearch',
      config: 'english',
    })
  }

  if (categoryId) {
    resourcesQuery = resourcesQuery.eq('category_id', categoryId)
  }

  if (params.province) {
    resourcesQuery = resourcesQuery.contains('provinces', [params.province])
  }

  resourcesQuery = resourcesQuery.order('created_at', { ascending: false })

  const [{ data: resources }, { data: categories }] = await Promise.all([
    resourcesQuery,
    supabase.from('resource_categories').select('*').order('name'),
  ])

  return (
    <GuidesClient
      initialResources={resources ?? []}
      initialCategories={categories ?? []}
      initialQuery={params.q ?? ''}
      initialCategory={params.category ?? null}
      initialProvince={params.province ?? null}
    />
  )
}
