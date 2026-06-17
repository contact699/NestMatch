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
