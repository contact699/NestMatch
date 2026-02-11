import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import GuidePageClient from './guide-page-client'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: resource } = await supabase
    .from('resources')
    .select('title, excerpt, tags')
    .eq('slug', slug)
    .single()

  if (!resource) {
    return { title: 'Resource Not Found' }
  }

  return {
    title: `${resource.title} | NestMatch Resources`,
    description: resource.excerpt || `Learn about ${resource.title}`,
    keywords: resource.tags?.join(', '),
    openGraph: {
      title: resource.title,
      description: resource.excerpt ?? undefined,
      type: 'article',
    },
  }
}

export default function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  return <GuidePageClient params={params} />
}
