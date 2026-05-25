import type { MetadataRoute } from 'next'
import { createServiceClient } from '@/lib/supabase/service'

export async function listingsSitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.nestmatch.app'

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('listings')
    .select('id, updated_at')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(50000)

  if (error) {
    throw new Error(`sitemap-listings: Supabase query failed: ${error.message}`)
  }
  if (!data) {
    throw new Error('sitemap-listings: Supabase returned no data and no error')
  }

  return data.map((row: { id: string; updated_at: string | null }) => ({
    url: `${baseUrl}/listings/${row.id}`,
    lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))
}
