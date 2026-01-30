'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from './button'
import {
  Camera,
  X,
  Upload,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react'

interface ImageUploaderProps {
  images: string[]
  onChange: (images: string[]) => void
  maxImages?: number
  bucket?: string
}

export function ImageUploader({
  images,
  onChange,
  maxImages = 10,
  bucket = 'listing-photos',
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', bucket)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      return result.url
    } catch (err) {
      console.error('Upload error:', err)
      throw err
    }
  }

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)

    // Check max images limit
    if (images.length + fileArray.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`)
      return
    }

    setIsUploading(true)
    setError(null)

    const uploadedUrls: string[] = []

    for (const file of fileArray) {
      try {
        const url = await uploadFile(file)
        if (url) {
          uploadedUrls.push(url)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
        break
      }
    }

    if (uploadedUrls.length > 0) {
      onChange([...images, ...uploadedUrls])
    }

    setIsUploading(false)
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [images])

  const removeImage = (index: number) => {
    const newImages = [...images]
    newImages.splice(index, 1)
    onChange(newImages)
  }

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return
    const newImages = [...images]
    const [removed] = newImages.splice(from, 1)
    newImages.splice(to, 0, removed)
    onChange(newImages)
  }

  return (
    <div className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group"
            >
              <img
                src={url}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => moveImage(index, index - 1)}
                    className="p-1.5 bg-white/90 rounded-full hover:bg-white"
                    title="Move left"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {index < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveImage(index, index + 1)}
                    className="p-1.5 bg-white/90 rounded-full hover:bg-white"
                    title="Move right"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                  title="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* First image badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                  Cover
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {images.length < maxImages && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
            ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />

          {isUploading ? (
            <>
              <Loader2 className="h-10 w-10 text-blue-500 mx-auto mb-3 animate-spin" />
              <p className="text-gray-600">Uploading...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Camera className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-1">
                Drag and drop images here, or click to browse
              </p>
              <p className="text-sm text-gray-400">
                JPEG, PNG, WebP, GIF up to 5MB each
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {images.length} / {maxImages} images
              </p>
            </>
          )}
        </div>
      )}

      {/* Tips */}
      <p className="text-xs text-gray-500">
        Tip: The first image will be used as the cover photo. Drag to reorder.
      </p>
    </div>
  )
}
