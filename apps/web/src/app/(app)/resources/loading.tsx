import { Loader2 } from 'lucide-react'

export default function ResourcesLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-9 w-64 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-5 w-96 bg-gray-100 rounded-lg animate-pulse mt-2" />
      </div>

      {/* Nav skeleton */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-9 w-24 bg-gray-100 rounded-full animate-pulse" />
        ))}
      </div>

      {/* Search skeleton */}
      <div className="max-w-2xl mb-8">
        <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
      </div>

      {/* Quick links skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="w-12 h-12 bg-gray-100 rounded-xl animate-pulse mb-4" />
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    </div>
  )
}
