import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Home, Search, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card variant="bordered" className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="text-6xl font-bold text-gray-200 mb-4">404</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Page not found
          </h2>
          <p className="text-gray-500 mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard">
              <Button variant="outline">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/search">
              <Button>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
