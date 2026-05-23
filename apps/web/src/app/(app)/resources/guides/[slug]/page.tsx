import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  LegalDisclaimer,
  LastUpdated,
  ProvinceBadge,
  HelpfulVote,
  BookmarkButton,
  ShareButton,
} from '@/components/resources'
import { Resource } from '@/types/database'
import { ArticleJsonLd, BreadcrumbListJsonLd } from '@/components/json-ld'

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

  if (!resource) return { title: 'Resource Not Found' }

  return {
    title: `${resource.title} | NestMatch Resources`,
    description: resource.excerpt || `Learn about ${resource.title}`,
    keywords: resource.tags?.join(', '),
    alternates: { canonical: `https://www.nestmatch.app/resources/guides/${slug}` },
    openGraph: {
      title: resource.title,
      description: resource.excerpt ?? undefined,
      type: 'article',
    },
  }
}

interface ContentBlock {
  type: 'heading' | 'paragraph' | 'list' | 'callout' | 'quote'
  level?: number
  text?: string
  items?: string[]
  variant?: 'info' | 'warning' | 'tip'
}

function renderContent(content: ContentBlock[] | string) {
  if (typeof content === 'string') {
    return (
      <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:text-on-surface prose-p:text-on-surface-variant">
        {content.split('\n\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    )
  }

  return (
    <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:text-on-surface prose-p:text-on-surface-variant">
      {content.map((block, index) => {
        switch (block.type) {
          case 'heading':
            if (block.level === 3) {
              return <h3 key={index} className="font-display">{block.text}</h3>
            }
            return <h2 key={index} className="font-display">{block.text}</h2>

          case 'paragraph':
            return <p key={index}>{block.text}</p>

          case 'list':
            return (
              <ul key={index}>
                {block.items?.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )

          case 'callout': {
            const colors = {
              info: 'bg-secondary-container/30 ghost-border text-on-surface',
              warning: 'bg-error-container/30 ghost-border text-on-surface',
              tip: 'bg-secondary-container ghost-border text-on-surface',
            }
            const labels = {
              info: 'Note',
              warning: 'Important',
              tip: 'Pro Tip',
            }
            return (
              <div
                key={index}
                className={`p-4 rounded-xl ${colors[block.variant || 'info']} not-prose`}
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-1">
                  {labels[block.variant || 'info']}
                </p>
                <p className="text-sm text-on-surface-variant">{block.text}</p>
              </div>
            )
          }

          case 'quote':
            return <blockquote key={index}>{block.text}</blockquote>

          default:
            return null
        }
      })}
    </div>
  )
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: resource } = await supabase
    .from('resources')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!resource) notFound()

  const url = `https://www.nestmatch.app/resources/guides/${slug}`

  return (
    <>
      {/* No image column exists on the resources table; pass image={null} */}
      <ArticleJsonLd
        url={url}
        title={resource.title}
        description={resource.excerpt}
        image={null}
        datePublished={resource.created_at}
        dateModified={resource.updated_at}
      />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://www.nestmatch.app' },
          { name: 'Guides', url: 'https://www.nestmatch.app/resources/guides' },
          { name: resource.title, url },
        ]}
      />
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-on-surface-variant">
        <Link href="/resources" className="hover:text-secondary transition-colors">NestMatch</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/resources" className="hover:text-secondary transition-colors">Resources</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/resources/guides" className="hover:text-secondary transition-colors">Guides</Link>
        {resource.provinces.length > 0 && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-on-surface">{resource.provinces[0]}</span>
          </>
        )}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          <article className="bg-surface-container-lowest ghost-border rounded-xl overflow-hidden">
            <div className="px-6 py-8 ghost-border-b">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-secondary-container text-secondary rounded-full capitalize">
                  <BookOpen className="h-3 w-3" />
                  {resource.resource_type}
                </span>
                {resource.provinces.map((province) => (
                  <ProvinceBadge key={province} province={province} />
                ))}
              </div>

              <h1 className="text-2xl sm:text-3xl font-display font-bold text-on-surface">
                {resource.title}
              </h1>

              {resource.subtitle && (
                <p className="text-lg text-on-surface-variant mt-2">{resource.subtitle}</p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                <LastUpdated
                  date={resource.updated_at}
                  reviewedAt={resource.last_reviewed_at}
                />
                <div className="flex items-center gap-2">
                  <BookmarkButton type="resource" itemId={resource.id} />
                  <ShareButton title={resource.title} />
                </div>
              </div>
            </div>

            {/* Legal Disclaimer */}
            <div className="px-6 py-4 bg-surface-container ghost-border-b">
              <LegalDisclaimer />
            </div>

            {/* Content */}
            <div className="px-6 py-8">
              {renderContent(resource.content as ContentBlock[] | string)}
            </div>

            {/* Footer */}
            <div className="px-6 py-6 bg-surface-container ghost-border-t">
              <HelpfulVote
                type="resource"
                itemId={resource.id}
                helpfulCount={resource.helpful_count}
              />

              {/* Tags */}
              {resource.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {resource.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-surface-container-high text-on-surface-variant rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <LegalDisclaimer variant="footer" />
            </div>
          </article>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* In this Guide - table of contents placeholder */}
          <div className="bg-surface-container-lowest ghost-border rounded-xl p-5 sticky top-4">
            <h3 className="font-display font-semibold text-on-surface mb-3">In this Guide</h3>
            <p className="text-sm text-on-surface-variant">
              Navigate through sections of this guide for quick access to specific topics.
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
