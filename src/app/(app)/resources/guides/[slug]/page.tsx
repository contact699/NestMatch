'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  LegalDisclaimer,
  LastUpdated,
  ProvinceBadge,
  HelpfulVote,
  BookmarkButton,
  ShareButton,
} from '@/components/resources'
import { Resource } from '@/types/database'

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
      <div className="prose prose-blue max-w-none">
        {content.split('\n\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    )
  }

  return (
    <div className="prose prose-blue max-w-none">
      {content.map((block, index) => {
        switch (block.type) {
          case 'heading':
            if (block.level === 3) {
              return <h3 key={index}>{block.text}</h3>
            }
            return <h2 key={index}>{block.text}</h2>

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

          case 'callout':
            const colors = {
              info: 'bg-blue-50 border-blue-200 text-blue-800',
              warning: 'bg-amber-50 border-amber-200 text-amber-800',
              tip: 'bg-green-50 border-green-200 text-green-800',
            }
            return (
              <div
                key={index}
                className={`p-4 rounded-lg border ${colors[block.variant || 'info']} not-prose`}
              >
                {block.text}
              </div>
            )

          case 'quote':
            return <blockquote key={index}>{block.text}</blockquote>

          default:
            return null
        }
      })}
    </div>
  )
}

export default function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [resource, setResource] = useState<Resource | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchResource = async () => {
      try {
        const response = await fetch(`/api/resources/${slug}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Guide not found')
          } else {
            setError('Failed to load guide')
          }
          return
        }
        const data = await response.json()
        setResource(data.resource)
      } catch (err) {
        setError('Failed to load guide')
      } finally {
        setIsLoading(false)
      }
    }

    fetchResource()
  }, [slug])

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  if (error || !resource) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Guide not found'}
          </h2>
          <p className="text-gray-600 mb-4">
            The guide you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.push('/resources/guides')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Guides
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/resources/guides"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Guides
        </Link>
      </div>

      {/* Header */}
      <article className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-8 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full capitalize">
              <BookOpen className="h-3 w-3" />
              {resource.resource_type}
            </span>
            {resource.provinces.map((province) => (
              <ProvinceBadge key={province} province={province} />
            ))}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {resource.title}
          </h1>

          {resource.subtitle && (
            <p className="text-lg text-gray-600 mt-2">{resource.subtitle}</p>
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
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <LegalDisclaimer />
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          {renderContent(resource.content as ContentBlock[] | string)}
        </div>

        {/* Footer */}
        <div className="px-6 py-6 bg-gray-50 border-t border-gray-100">
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
                  className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-full"
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
  )
}
