import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/settings/', '/onboarding/'],
      },
    ],
    sitemap: 'https://www.nestmatch.app/sitemap.xml',
  }
}
