import { describe, it, expect, beforeAll } from 'vitest'

import { dHashFromGray, hammingDistance, isNearDuplicate, isAllowedImageUrl } from '../image-hash'

// isAllowedImageUrl reads the env var at call time.
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co'
})

// dHash compares each pixel to its right neighbor on a (w) x h grid (w = size+1).
// Build a 9x8 gradient (left→right increasing): every row yields 8 "left<right" → all 1 bits.
const W = 9, H = 8
const gradient: number[] = []
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) gradient.push(x * 28)

describe('dHash + hamming distance', () => {
  it('gradient → all-ones hex (64 bits set)', () => {
    expect(dHashFromGray(gradient, W, H)).toBe('ffffffffffffffff')
  })

  it('identical hashes → distance 0', () => {
    expect(hammingDistance('ffffffffffffffff', 'ffffffffffffffff')).toBe(0)
  })

  it('one nibble differs → distance counts differing bits', () => {
    // ...e vs ...f differ in 1 bit
    expect(hammingDistance('fffffffffffffffe', 'ffffffffffffffff')).toBe(1)
  })

  it('near-duplicate within threshold', () => {
    expect(isNearDuplicate('fffffffffffffffe', 'ffffffffffffffff', 10)).toBe(true)
  })

  it('different beyond threshold', () => {
    expect(isNearDuplicate('0000000000000000', 'ffffffffffffffff', 10)).toBe(false)
  })
})

// SSRF allowlist: only our Supabase Storage listing-photos URLs are hashable.
describe('isAllowedImageUrl', () => {
  it('allows our storage listing-photos url', () => {
    expect(
      isAllowedImageUrl('https://abc.supabase.co/storage/v1/object/public/listing-photos/123/a.jpg'),
    ).toBe(true)
  })

  it('rejects foreign host', () => {
    expect(isAllowedImageUrl('https://evil.example.com/x.jpg')).toBe(false)
  })

  it('rejects internal/metadata host', () => {
    expect(isAllowedImageUrl('http://169.254.169.254/latest/meta-data/')).toBe(false)
  })

  it('rejects our host but wrong bucket/path', () => {
    expect(isAllowedImageUrl('https://abc.supabase.co/storage/v1/object/public/avatars/x.jpg')).toBe(false)
  })

  it('rejects non-https', () => {
    expect(
      isAllowedImageUrl('http://abc.supabase.co/storage/v1/object/public/listing-photos/1/a.jpg'),
    ).toBe(false)
  })

  it('rejects garbage url', () => {
    expect(isAllowedImageUrl('not a url')).toBe(false)
  })
})
