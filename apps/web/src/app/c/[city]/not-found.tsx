// apps/web/src/app/c/[city]/not-found.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'City Not Found',
  robots: { index: false, follow: false },
}

export default function CityNotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-display font-bold text-on-surface mb-2">
        We don&apos;t have a page for this city yet
      </h1>
      <p className="text-on-surface-variant mb-6">
        Try one of our flagship cities below, or browse all available rooms.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/c/toronto"><Button variant="outline">Toronto</Button></Link>
        <Link href="/c/vancouver"><Button variant="outline">Vancouver</Button></Link>
        <Link href="/c/montreal"><Button variant="outline">Montréal</Button></Link>
        <Link href="/c/ottawa"><Button variant="outline">Ottawa</Button></Link>
        <Link href="/c/calgary"><Button variant="outline">Calgary</Button></Link>
      </div>
      <div className="mt-6">
        <Link href="/search"><Button>Browse all rooms</Button></Link>
      </div>
    </div>
  )
}
