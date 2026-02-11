'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { clientLogger } from '@/lib/client-logger'
import { Loader2, Bookmark, BookOpen, HelpCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ResourceBookmark } from '@/types/database'

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<ResourceBookmark[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchBookmarks = async () => {
    try {
      const response = await fetch('/api/resources/bookmarks')
      if (response.ok) {
        const data = await response.json()
        setBookmarks(data.bookmarks || [])
      }
    } catch (error) {
      clientLogger.error('Error fetching bookmarks', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBookmarks()
  }, [])

  const handleDelete = async (bookmark: ResourceBookmark) => {
    const id = bookmark.resource_id || bookmark.faq_id
    const type = bookmark.resource_id ? 'resource' : 'faq'

    setDeletingId(bookmark.id)

    try {
      const response = await fetch(`/api/resources/bookmarks/${id}?type=${type}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setBookmarks((prev) => prev.filter((b) => b.id !== bookmark.id))
      }
    } catch (error) {
      clientLogger.error('Error deleting bookmark', error)
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bookmark className="h-7 w-7 text-blue-600" />
          Saved Resources
        </h1>
        <p className="mt-1 text-gray-600">
          Your bookmarked guides and FAQs for quick access
        </p>
      </div>

      {/* Content */}
      {bookmarks.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="py-12 text-center">
            <Bookmark className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No saved resources yet
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Bookmark guides and FAQs while browsing to save them here for easy access later.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/resources/guides">
                <Button variant="outline">Browse Guides</Button>
              </Link>
              <Link href="/resources/faq">
                <Button variant="outline">Browse FAQs</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((bookmark) => {
            const resource = (bookmark as any).resource
            const faq = (bookmark as any).faq
            const isResource = !!resource

            return (
              <div
                key={bookmark.id}
                className="group flex items-start gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
              >
                <div
                  className={`
                    w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                    ${isResource ? 'bg-blue-50' : 'bg-green-50'}
                  `}
                >
                  {isResource ? (
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  ) : (
                    <HelpCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {isResource ? (
                    <Link
                      href={`/resources/guides/${resource.slug}`}
                      className="block"
                    >
                      <h3 className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                        {resource.title}
                      </h3>
                      {resource.excerpt && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {resource.excerpt}
                        </p>
                      )}
                    </Link>
                  ) : (
                    <Link href="/resources/faq" className="block">
                      <h3 className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                        {faq.question}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {faq.answer}
                      </p>
                    </Link>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Saved {new Date(bookmark.created_at).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(bookmark)}
                  disabled={deletingId === bookmark.id}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove bookmark"
                >
                  {deletingId === bookmark.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
