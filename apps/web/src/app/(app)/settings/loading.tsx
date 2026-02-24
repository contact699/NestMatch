export default function SettingsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link skeleton */}
      <div className="h-4 w-36 bg-gray-100 rounded animate-pulse mb-6" />

      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-56 bg-gray-100 rounded animate-pulse mt-2" />
      </div>

      {/* Settings cards */}
      <div className="space-y-6">
        {/* Account card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
                <div>
                  <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-5 w-5 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Blocked users card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-1" />
            <div className="h-3 w-72 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="px-6 py-4">
            <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>

        {/* Notifications card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-4 border-b border-gray-100 last:border-0">
              <div>
                <div className="h-4 w-36 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-5 w-10 bg-gray-200 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
