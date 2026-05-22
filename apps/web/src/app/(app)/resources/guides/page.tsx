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

  const [{ data: resources }, { data: categories }] = await Promise.all([
    supabase
      .from('resources')
      .select('*')
      .eq('is_published', true)
      .or(`publish_at.is.null,publish_at.lte.${now}`)
      .or(`unpublish_at.is.null,unpublish_at.gt.${now}`)
      .order('created_at', { ascending: false }),
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
