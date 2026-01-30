import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    </div>
  )
}
