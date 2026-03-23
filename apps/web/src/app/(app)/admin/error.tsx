'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin error:', error)
  }, [error])

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card variant="bordered" className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="w-12 h-12 bg-error-container rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-6 w-6 text-error" />
          </div>
          <h2 className="text-lg font-display font-semibold text-on-surface mb-2">
            Admin Error
          </h2>
          <p className="text-on-surface-variant mb-6">
            Something went wrong in the admin panel. Please try again or return to the admin dashboard.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={reset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
            <Link href="/admin">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
          </div>
          {error.digest && (
            <p className="mt-4 text-xs text-on-surface-variant/60">
              Error ID: {error.digest}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
