'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card variant="bordered" className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-500 mb-6">
            We encountered an unexpected error. Please try again or return to the dashboard.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={reset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
            <Link href="/dashboard">
              <Button>
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
          {error.digest && (
            <p className="mt-4 text-xs text-gray-400">
              Error ID: {error.digest}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
