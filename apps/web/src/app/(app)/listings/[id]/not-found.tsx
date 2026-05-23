import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Listing Not Found',
  robots: { index: false, follow: false },
}

export default function ListingNotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-display font-bold text-on-surface mb-2">
        This listing is no longer available
      </h1>
      <p className="text-on-surface-variant mb-6">
        The listing may have been removed by the host or expired. Browse current
        rooms or search by city.
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/search">
          <Button>Browse rooms</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Back to home</Button>
        </Link>
      </div>
    </div>
  )
}
