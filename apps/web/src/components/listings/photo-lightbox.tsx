'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface PhotoLightboxProps {
  photos: string[]
  /** Index of the photo to open with. Set to null to close. */
  openAt: number | null
  onClose: () => void
  /** Optional alt-text base; used as `${altBase} - Photo N` */
  altBase?: string
}

/**
 * Full-screen image viewer with prev/next navigation. Mounts only when
 * `openAt` is non-null. Closes on Escape, backdrop click, or the X button.
 */
export function PhotoLightbox({
  photos,
  openAt,
  onClose,
  altBase = 'Listing photo',
}: PhotoLightboxProps) {
  const [index, setIndex] = useState(openAt ?? 0)

  // Sync internal index when caller bumps openAt to a new photo.
  useEffect(() => {
    if (openAt !== null) setIndex(openAt)
  }, [openAt])

  const total = photos.length
  const goPrev = useCallback(
    () => setIndex((i) => (i - 1 + total) % total),
    [total]
  )
  const goNext = useCallback(
    () => setIndex((i) => (i + 1) % total),
    [total]
  )

  // Keyboard handlers + body scroll lock — only while open.
  useEffect(() => {
    if (openAt === null) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [openAt, onClose, goPrev, goNext])

  if (openAt === null || total === 0) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label={`${altBase} viewer`}
      onClick={onClose}
    >
      {/* Close */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose() }}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-black/50 text-white text-sm font-medium">
        {index + 1} / {total}
      </div>

      {/* Prev */}
      {total > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goPrev() }}
          aria-label="Previous photo"
          className="absolute left-4 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Image — stop click bubbling so tapping the image itself doesn't close */}
      <img
        src={photos[index]}
        alt={`${altBase} - Photo ${index + 1}`}
        className="max-w-[92vw] max-h-[88vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next */}
      {total > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goNext() }}
          aria-label="Next photo"
          className="absolute right-4 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}
