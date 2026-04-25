'use client'

import { useState, type ReactNode } from 'react'
import { Home } from 'lucide-react'
import { PhotoLightbox } from './photo-lightbox'

interface ListingPhotoGalleryProps {
  photos: string[]
  title: string
  /** Badges overlaid on the main (first) photo — server-rendered, passed as children */
  mainPhotoBadges?: ReactNode
}

/**
 * Replaces the inline photo grid on the listing detail page so each photo
 * can open in a full-screen lightbox. Layout/visuals match the previous
 * server-rendered grid; only the click handler and lightbox are added.
 */
export function ListingPhotoGallery({
  photos,
  title,
  mainPhotoBadges,
}: ListingPhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (!photos || photos.length === 0) {
    return (
      <div className="h-[400px] bg-surface-container rounded-2xl flex items-center justify-center">
        <Home className="h-16 w-16 text-on-surface-variant/20" />
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[400px] lg:h-[480px] rounded-2xl overflow-hidden">
        {/* Main large image */}
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="col-span-2 row-span-2 relative cursor-zoom-in group focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          aria-label={`Open photo 1 of ${photos.length}`}
        >
          <img
            src={photos[0]}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {mainPhotoBadges && (
            <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none">
              {mainPhotoBadges}
            </div>
          )}
        </button>

        {/* Secondary images */}
        {photos.slice(1, 5).map((photo, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightboxIndex(i + 1)}
            className="relative overflow-hidden cursor-zoom-in group focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            aria-label={`Open photo ${i + 2} of ${photos.length}`}
          >
            <img
              src={photo}
              alt={`${title} - Photo ${i + 2}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* "+ N more" overlay on the last visible thumbnail when there are extras */}
            {i === 3 && photos.length > 5 && (
              <div className="absolute inset-0 bg-black/55 flex items-center justify-center pointer-events-none">
                <span className="text-white text-lg font-semibold">
                  +{photos.length - 5} more
                </span>
              </div>
            )}
          </button>
        ))}

        {/* Fill empty slots */}
        {photos.length < 5 &&
          Array.from({ length: Math.max(0, 5 - photos.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="bg-surface-container flex items-center justify-center"
            >
              <Home className="h-8 w-8 text-on-surface-variant/20" />
            </div>
          ))}
      </div>

      <PhotoLightbox
        photos={photos}
        openAt={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        altBase={title}
      />
    </>
  )
}
