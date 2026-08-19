/**
 * Client-side image downscaling for uploads.
 *
 * Stored photos were previously camera originals (up to 10MB each), which the
 * app then decoded into small thumbnails — the dominant cost of slow listing
 * pages. Downscaling before upload bounds both storage and decode cost.
 *
 * Fail-open by design: any decode/encode problem returns the original file so
 * an odd image can never block an upload.
 */

const MAX_DIMENSION = 1920
const JPEG_QUALITY = 0.82
// Files at or under this size that need no resize are left untouched —
// re-encoding tiny images just burns CPU and can grow them.
const SIZE_FLOOR_BYTES = 300 * 1024
// Animated formats lose their animation on a canvas round-trip.
const SKIP_TYPES = new Set(['image/gif'])

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      // 'from-image' applies EXIF orientation so portrait photos stay upright.
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Fall through to the <img> loader (older Safari, odd encodings).
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to decode image'))
    }
    img.src = url
  })
}

function toJpegName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '')
  return `${base || 'photo'}.jpg`
}

export async function downscaleImage(file: File): Promise<File> {
  if (SKIP_TYPES.has(file.type)) return file

  try {
    const source = await loadBitmap(file)
    const width = 'naturalWidth' in source ? source.naturalWidth : source.width
    const height = 'naturalHeight' in source ? source.naturalHeight : source.height
    if (!width || !height) return file

    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))
    if (scale === 1 && file.size <= SIZE_FLOOR_BYTES) {
      if ('close' in source) source.close()
      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    // JPEG has no alpha — flatten transparency onto white instead of black.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    if ('close' in source) source.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    )
    if (!blob) return file
    // If we didn't resize and the re-encode came out larger, keep the original.
    if (scale === 1 && blob.size >= file.size) return file

    return new File([blob], toJpegName(file.name), { type: 'image/jpeg' })
  } catch {
    return file
  }
}
