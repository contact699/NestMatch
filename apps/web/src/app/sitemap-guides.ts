import type { MetadataRoute } from 'next'
import { createServiceClient } from '@/lib/supabase/service'

export async function guidesSitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.nestmatch.app'

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('resources')
    .select('slug, updated_at')
    .eq('is_published', true)
    .or(`publish_at.is.null,publish_at.lte.${now}`)
    .or(`unpublish_at.is.null,unpublish_at.gt.${now}`)
    .order('updated_at', { ascending: false })
    .limit(50000)

  if (error) {
    throw new Error(`sitemap-guides: Supabase query failed: ${error.message}`)
  }
  if (!data) {
    throw new Error('sitemap-guides: Supabase returned no data and no error')
  }

  return data.map((row: { slug: string; updated_at: string | null }) => ({
    url: `${baseUrl}/resources/guides/${row.slug}`,
    lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))
}
