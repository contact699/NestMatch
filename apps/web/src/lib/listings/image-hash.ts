// Difference hash (dHash): downscale to (size+1) x size grayscale, compare each
// pixel to its right neighbor → size*size bits, serialized as hex.

export const DHASH_SIZE = 8 // → 64-bit hash
export const NEAR_DUPLICATE_THRESHOLD = 10 // Hamming distance; <= is "near duplicate"

/** Pure core: build a hex dHash from a grayscale pixel grid of width w=(size+1), height h=size. */
export function dHashFromGray(gray: number[], w: number, h: number): string {
  let bits = ''
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w - 1; x++) {
      const left = gray[y * w + x]
      const right = gray[y * w + x + 1]
      bits += left < right ? '1' : '0'
    }
  }
  // bits.length === h * (w-1); pad to nibble and hex-encode.
  let hex = ''
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4).padEnd(4, '0'), 2).toString(16)
  }
  return hex
}

const POPCOUNT: number[] = Array.from({ length: 16 }, (_, n) =>
  ((n >> 0) & 1) + ((n >> 1) & 1) + ((n >> 2) & 1) + ((n >> 3) & 1)
)

/** Hamming distance between two equal-length hex hashes. */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY
  let d = 0
  for (let i = 0; i < a.length; i++) {
    d += POPCOUNT[parseInt(a[i], 16) ^ parseInt(b[i], 16)]
  }
  return d
}

export function isNearDuplicate(a: string, b: string, threshold = NEAR_DUPLICATE_THRESHOLD): boolean {
  return hammingDistance(a, b) <= threshold
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB cap before decoding
const FETCH_TIMEOUT_MS = 5000

/**
 * Only listing photos served from our own Supabase Storage bucket are hashable.
 * This prevents the server from being used to fetch arbitrary URLs (SSRF) — the
 * `url` originates from user-controlled listing data.
 */
export function isAllowedImageUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return false
  let parsed: URL
  let allowedHost: string
  try {
    parsed = new URL(url)
    allowedHost = new URL(base).host
  } catch {
    return false
  }
  return (
    parsed.protocol === 'https:' &&
    parsed.host === allowedHost &&
    parsed.pathname.includes('/storage/v1/object/public/listing-photos/')
  )
}

/**
 * Fetch an allow-listed Storage image and return its dHash, or null on failure
 * (never throws). Hardened against SSRF/DoS: origin allowlist, request timeout,
 * image content-type check, and a byte cap before handing bytes to sharp.
 */
export async function hashImageUrl(url: string): Promise<string | null> {
  if (!isAllowedImageUrl(url)) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) return null
    const declaredLength = Number(res.headers.get('content-length') ?? '0')
    if (declaredLength > MAX_IMAGE_BYTES) return null
    const bytes = await readResponseBytes(res, MAX_IMAGE_BYTES)
    if (!bytes) return null
    const buf = Buffer.from(bytes)
    const sharp = (await import('sharp')).default
    const w = DHASH_SIZE + 1
    const h = DHASH_SIZE
    const gray = await sharp(buf)
      .resize(w, h, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer()
    return dHashFromGray(Array.from(gray), w, h)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function readResponseBytes(res: Response, maxBytes: number): Promise<Uint8Array | null> {
  const reader = res.body?.getReader()
  if (!reader) return null

  const chunks: Uint8Array[] = []
  let total = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue

      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}
