'use client'

import Link from 'next/link'
import { ArrowRight, Eye, ThumbsUp, BookOpen, FileText, CheckSquare } from 'lucide-react'
import { Resource } from '@/types/database'
import { ProvinceBadge } from './province-filter'

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  guide: BookOpen,
  article: FileText,
  checklist: CheckSquare,
}

interface ResourceCardProps {
  resource: Resource
  showCategory?: boolean
  categoryName?: string
}

export function ResourceCard({ resource, showCategory, categoryName }: ResourceCardProps) {
  const Icon = TYPE_ICONS[resource.resource_type] || BookOpen

  return (
    <Link
      href={`/resources/guides/${resource.slug}`}
      className="group block bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full capitalize">
              <Icon className="h-3 w-3" />
              {resource.resource_type}
            </span>
            {showCategory && categoryName && (
              <span className="text-xs text-gray-500">{categoryName}</span>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
            {resource.title}
          </h3>

          {resource.subtitle && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-1">{resource.subtitle}</p>
          )}

          {resource.excerpt && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{resource.excerpt}</p>
          )}

          <div className="flex items-center gap-4 mt-3">
            {resource.provinces.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {resource.provinces.slice(0, 2).map((province) => (
                  <ProvinceBadge key={province} province={province} />
                ))}
                {resource.provinces.length > 2 && (
                  <span className="text-xs text-gray-500">+{resource.provinces.length - 2}</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {resource.view_count}
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3.5 w-3.5" />
                {resource.helpful_count}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <ArrowRight className="h-5 w-5 text-blue-600" />
          </div>
        </div>
      </div>
    </Link>
  )
}

interface FeaturedResourceCardProps {
  resource: Resource
}

export function FeaturedResourceCard({ resource }: FeaturedResourceCardProps) {
  const Icon = TYPE_ICONS[resource.resource_type] || BookOpen

  return (
    <Link
      href={`/resources/guides/${resource.slug}`}
      className="group block bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white hover:from-blue-700 hover:to-blue-800 transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-blue-200 uppercase tracking-wide">
            Featured Guide
          </span>
          <h3 className="font-semibold text-lg mt-1 group-hover:underline">
            {resource.title}
          </h3>
          {resource.excerpt && (
            <p className="text-sm text-blue-100 mt-2 line-clamp-2">{resource.excerpt}</p>
          )}
          <div className="flex items-center gap-2 mt-3 text-sm text-blue-200">
            <span>Read guide</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  )
}
