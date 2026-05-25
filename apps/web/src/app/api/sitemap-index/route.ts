import { NextResponse } from 'next/server'

// Revalidate hourly to match the chunk sitemaps' ISR cadence.
export const revalidate = 3600

const BASE_URL = 'https://www.nestmatch.app'

// IDs must mirror what generateSitemaps() returns in sitemap.ts.
const CHUNK_IDS = [0, 1, 2, 3]

export async function GET() {
  const now = new Date().toISOString()

  const entries = CHUNK_IDS.map(
    (id) =>
      `  <sitemap>\n` +
      `    <loc>${BASE_URL}/sitemap/${id}.xml</loc>\n` +
      `    <lastmod>${now}</lastmod>\n` +
      `  </sitemap>`
  ).join('\n')

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${entries}\n` +
    `</sitemapindex>\n`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
