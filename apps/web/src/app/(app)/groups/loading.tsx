export default function GroupsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2" />
        </div>
        <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
      </div>

      {/* Group cards */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-7 w-28 bg-gray-200 rounded-full animate-pulse" />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex -space-x-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white animate-pulse" />
                ))}
              </div>
              <div className="flex items-center gap-4">
                <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
