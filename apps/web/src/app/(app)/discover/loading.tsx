export default function DiscoverLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-56 bg-gray-100 rounded animate-pulse mt-2" />
        </div>
        <div className="h-9 w-32 bg-gray-200 rounded-lg animate-pulse" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 pb-px">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 w-36 bg-gray-100 rounded-t-lg animate-pulse" />
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse" />
              <div className="flex-1">
                <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="flex gap-2 pt-4 border-t border-gray-100">
              <div className="h-9 flex-1 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-9 flex-1 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
