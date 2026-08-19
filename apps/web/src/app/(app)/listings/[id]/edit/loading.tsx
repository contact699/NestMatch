export default function EditListingLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="h-4 w-32 bg-surface-container rounded animate-pulse mb-6" />
      <div className="rounded-2xl border border-outline-variant/30 p-6">
        <div className="h-6 w-40 bg-surface-container rounded animate-pulse mb-6" />
        <div className="space-y-5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i}>
              <div className="h-3 w-28 bg-surface-container-low rounded animate-pulse mb-2" />
              <div className="h-10 w-full bg-surface-container rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
