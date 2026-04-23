'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clientLogger } from '@/lib/client-logger'
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Custom MIME so the upload-area drop handler can ignore internal thumbnail drags
  const THUMB_DRAG_MIME = 'application/x-nestmatch-image-index'

  const uploadFile = async (file: File): Promise<string | null> => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.')
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 10MB.')
    }

    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('You must be logged in to upload images')
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop() || 'jpg'
    const filename = `${user.id}/${timestamp}-${randomString}.${extension}`

    // Upload directly to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      clientLogger.error('Upload error', uploadError)
      throw new Error(uploadError.message || 'Failed to upload file')
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return urlData.publicUrl
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
    // Ignore reorder drags so the upload area doesn't light up
    if (e.dataTransfer.types.includes(THUMB_DRAG_MIME)) return
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

  const handleThumbDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData(THUMB_DRAG_MIME, String(index))
  }

  const handleThumbDragOver = (index: number) => (e: React.DragEvent) => {
    if (draggedIndex === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) setDragOverIndex(index)
  }

  const handleThumbDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (draggedIndex !== null && draggedIndex !== index) {
      moveImage(draggedIndex, index)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleThumbDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

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
        <div className="p-3 bg-error-container border border-error/30 rounded-lg flex items-center gap-2 text-error text-sm">
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
              draggable
              onDragStart={handleThumbDragStart(index)}
              onDragOver={handleThumbDragOver(index)}
              onDrop={handleThumbDrop(index)}
              onDragEnd={handleThumbDragEnd}
              onDragLeave={() => setDragOverIndex((current) => (current === index ? null : current))}
              className={`
                relative aspect-square bg-surface-container-low rounded-lg overflow-hidden group cursor-move
                ${draggedIndex === index ? 'opacity-40' : ''}
                ${dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-primary ring-offset-2' : ''}
              `}
            >
              <img
                src={url}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover pointer-events-none"
              />

              {/* Overlay with actions — visible on touch, hover-revealed on desktop */}
              <div className="absolute inset-0 bg-black/30 md:bg-black/50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
                  className="p-1.5 bg-error text-on-primary rounded-full hover:bg-error/90"
                  title="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* First image badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-primary text-on-primary text-xs px-2 py-0.5 rounded-full">
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
            ${dragActive ? 'border-primary bg-primary-fixed' : 'border-outline-variant/30 hover:border-outline-variant/50'}
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
              <Loader2 className="h-10 w-10 text-secondary mx-auto mb-3 animate-spin" />
              <p className="text-on-surface-variant">Uploading...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-surface-container-low rounded-full flex items-center justify-center mx-auto mb-3">
                <Camera className="h-6 w-6 text-outline" />
              </div>
              <p className="text-on-surface-variant mb-1">
                Drag and drop images here, or click to browse
              </p>
              <p className="text-sm text-outline">
                JPEG, PNG, WebP, GIF up to 10MB each
              </p>
              <p className="text-sm text-outline mt-1">
                {images.length} / {maxImages} images
              </p>
            </>
          )}
        </div>
      )}

      {/* Tips */}
      <p className="text-xs text-on-surface-variant">
        Tip: The first image will be used as the cover photo. Drag to reorder.
      </p>
    </div>
  )
}
