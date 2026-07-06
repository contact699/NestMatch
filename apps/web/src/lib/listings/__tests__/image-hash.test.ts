// Run with `npm run test:listing-verification` (uses tsx).
import { strict as assert } from 'node:assert'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co'
import { dHashFromGray, hammingDistance, isNearDuplicate, isAllowedImageUrl } from '../image-hash'

// dHash compares each pixel to its right neighbor on a (w) x h grid (w = size+1).
// Build a 9x8 gradient (left→right increasing): every row yields 8 "left<right" → all 1 bits.
const W = 9, H = 8
const gradient: number[] = []
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) gradient.push(x * 28)

let passed = 0, failed = 0
function check(name: string, fn: () => void) {
  try { fn(); passed++ } catch (e) { failed++; console.error(`FAIL: ${name} — ${(e as Error).message}`) }
}

check('gradient → all-ones hex (64 bits set)', () => {
  const h = dHashFromGray(gradient, W, H)
  assert.equal(h, 'ffffffffffffffff')
})
check('identical hashes → distance 0', () => {
  assert.equal(hammingDistance('ffffffffffffffff', 'ffffffffffffffff'), 0)
})
check('one nibble differs → distance counts differing bits', () => {
  // ...e vs ...f differ in 1 bit
  assert.equal(hammingDistance('fffffffffffffffe', 'ffffffffffffffff'), 1)
})
check('near-duplicate within threshold', () => {
  assert.equal(isNearDuplicate('fffffffffffffffe', 'ffffffffffffffff', 10), true)
})
check('different beyond threshold', () => {
  assert.equal(isNearDuplicate('0000000000000000', 'ffffffffffffffff', 10), false)
})

// SSRF allowlist: only our Supabase Storage listing-photos URLs are hashable.
check('allows our storage listing-photos url', () => {
  assert.equal(
    isAllowedImageUrl('https://abc.supabase.co/storage/v1/object/public/listing-photos/123/a.jpg'),
    true,
  )
})
check('rejects foreign host', () => {
  assert.equal(isAllowedImageUrl('https://evil.example.com/x.jpg'), false)
})
check('rejects internal/metadata host', () => {
  assert.equal(isAllowedImageUrl('http://169.254.169.254/latest/meta-data/'), false)
})
check('rejects our host but wrong bucket/path', () => {
  assert.equal(isAllowedImageUrl('https://abc.supabase.co/storage/v1/object/public/avatars/x.jpg'), false)
})
check('rejects non-https', () => {
  assert.equal(
    isAllowedImageUrl('http://abc.supabase.co/storage/v1/object/public/listing-photos/1/a.jpg'),
    false,
  )
})
check('rejects garbage url', () => {
  assert.equal(isAllowedImageUrl('not a url'), false)
})

console.log(`image-hash: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
