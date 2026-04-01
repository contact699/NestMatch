'use client'

import { useEffect } from 'react'
import { clientLogger } from '@/lib/client-logger'
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
    clientLogger.error('Application error', error)
  }, [error])

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card variant="bordered" className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="w-12 h-12 bg-error-container rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-6 w-6 text-error" />
          </div>
          <h2 className="text-lg font-semibold text-on-surface mb-2">
            Something went wrong
          </h2>
          <p className="text-on-surface-variant mb-6">
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
            <p className="mt-4 text-xs text-outline">
              Error ID: {error.digest}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
