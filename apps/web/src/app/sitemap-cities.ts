import type { MetadataRoute } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { FLAGSHIP_CITIES } from '@/lib/cities'

const THRESHOLD = 5

export async function citiesSitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.nestmatch.app'
  const supabase = createServiceClient()

  const entries: MetadataRoute.Sitemap = []
  for (const city of FLAGSHIP_CITIES) {
    const { count, error } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .ilike('city', city.dbName)

    if (error) {
      throw new Error(
        `sitemap-cities: failed counting ${city.slug}: ${error.message}`
      )
    }

    if ((count ?? 0) >= THRESHOLD) {
      entries.push({
        url: `${baseUrl}/c/${city.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
  }

  return entries
}
