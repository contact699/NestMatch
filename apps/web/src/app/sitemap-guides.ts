import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function guidesSitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.nestmatch.app'

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('resources')
      .select('slug, updated_at, is_published')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })
      .limit(50000)

    if (error || !data) {
      logger.error(
        'sitemap-guides fetch failed',
        error instanceof Error ? error : new Error(String(error))
      )
      return []
    }

    return data.map((row: any) => ({
      url: `${baseUrl}/resources/guides/${row.slug}`,
      lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  } catch (err) {
    logger.error(
      'sitemap-guides exception',
      err instanceof Error ? err : new Error(String(err))
    )
    return []
  }
}
