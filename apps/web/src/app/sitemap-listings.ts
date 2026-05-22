import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function listingsSitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.nestmatch.app'

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('listings')
      .select('id, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(50000)

    if (error || !data) {
      logger.error(
        'sitemap-listings fetch failed',
        error instanceof Error ? error : new Error(String(error))
      )
      return []
    }

    return data.map((row: any) => ({
      url: `${baseUrl}/listings/${row.id}`,
      lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }))
  } catch (err) {
    logger.error(
      'sitemap-listings exception',
      err instanceof Error ? err : new Error(String(err))
    )
    return []
  }
}
