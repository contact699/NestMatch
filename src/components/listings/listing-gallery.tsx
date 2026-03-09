'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Home } from 'lucide-react'

interface ListingGalleryProps {
  photos: string[]
  title: string
}

export function ListingGallery({ photos, title }: ListingGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Home className="h-16 w-16 text-gray-300" />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full group">
      <img
        src={photos[currentIndex]}
        alt={`${title} - Photo ${currentIndex + 1}`}
        className="w-full h-full object-cover transition-opacity duration-300"
      />

      {/* Prev/Next arrows - visible on hover */}
      {photos.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((i) => (i === 0 ? photos.length - 1 : i - 1))}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentIndex((i) => (i === photos.length - 1 ? 0 : i + 1))}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Counter badge */}
      {photos.length > 1 && (
        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          {currentIndex + 1} / {photos.length}
        </div>
      )}

      {/* Dot indicators */}
      {photos.length > 1 && photos.length <= 10 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentIndex ? 'bg-white w-4' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
