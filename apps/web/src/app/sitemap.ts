import type { MetadataRoute } from 'next'
import { staticSitemap } from './sitemap-static'
import { listingsSitemap } from './sitemap-listings'
import { guidesSitemap } from './sitemap-guides'
import { citiesSitemap } from './sitemap-cities'

export const revalidate = 3600

export async function generateSitemaps() {
  return [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }]
}

export default async function sitemap({
  id,
}: {
  id: number | string | Promise<number | string>
}): Promise<MetadataRoute.Sitemap> {
  const chunkId = Number(await id)
  if (chunkId === 0) return staticSitemap()
  if (chunkId === 1) return listingsSitemap()
  if (chunkId === 2) return guidesSitemap()
  if (chunkId === 3) return citiesSitemap()
  return []
}
