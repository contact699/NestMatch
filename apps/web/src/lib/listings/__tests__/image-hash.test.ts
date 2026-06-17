// Run with `npm run test:listing-verification` (uses tsx).
import { strict as assert } from 'node:assert'
import { dHashFromGray, hammingDistance, isNearDuplicate } from '../image-hash'

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

console.log(`image-hash: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
