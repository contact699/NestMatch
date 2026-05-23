import type { MetadataRoute } from 'next'
import { staticSitemap } from './sitemap-static'
import { listingsSitemap } from './sitemap-listings'
import { guidesSitemap } from './sitemap-guides'

export const revalidate = 3600

export async function generateSitemaps() {
  return [{ id: 0 }, { id: 1 }, { id: 2 }]
}

export default async function sitemap({
  id,
}: {
  id: number
}): Promise<MetadataRoute.Sitemap> {
  if (id === 0) return staticSitemap()
  if (id === 1) return listingsSitemap()
  if (id === 2) return guidesSitemap()
  return []
}
