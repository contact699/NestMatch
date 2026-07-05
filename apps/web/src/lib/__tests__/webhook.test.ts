import { describe, it, expect } from 'vitest'
import crypto from 'node:crypto'
import { verifyWebhookSignature } from '../webhook'

// NOTE: registerWebhookEvent / completeWebhookEvent / failWebhookEvent /
// processWebhookIdempotent are DB-bound (supabase + audit log) and
// intentionally not covered here. mapWebhookEvent is an unexported helper.

describe('verifyWebhookSignature', () => {
  describe('stripe provider', () => {
    const secret = 'whsec_test'
    const payload = '{"id":"evt_1"}'
    const timestamp = '1700000000'
    // Known-good vector computed independently via node crypto:
    // hmac_sha256(secret, `${timestamp}.${payload}`).digest('hex')
    const validSig = 'c89214b5b5da833daed6f0b8c5bb6bd58cea9022bd80ccc78230f3942d632925'

    it('accepts a valid v1 signature', async () => {
      const header = `t=${timestamp},v1=${validSig}`
      await expect(verifyWebhookSignature('stripe', payload, header, secret)).resolves.toBe(true)
    })

    it('rejects a tampered payload', async () => {
      const header = `t=${timestamp},v1=${validSig}`
      await expect(
        verifyWebhookSignature('stripe', '{"id":"evt_TAMPERED"}', header, secret)
      ).resolves.toBe(false)
    })

    it('rejects when the secret is wrong', async () => {
      const header = `t=${timestamp},v1=${validSig}`
      await expect(verifyWebhookSignature('stripe', payload, header, 'wrong_secret')).resolves.toBe(false)
    })

    it('rejects a header missing the t= element', async () => {
      await expect(verifyWebhookSignature('stripe', payload, `v1=${validSig}`, secret)).resolves.toBe(false)
    })

    it('rejects a header missing the v1= element', async () => {
      await expect(verifyWebhookSignature('stripe', payload, `t=${timestamp}`, secret)).resolves.toBe(false)
    })

    // NOTE: crypto.timingSafeEqual throws when buffer lengths differ; the code
    // catches this in the outer try/catch and returns false rather than
    // throwing, for any v1 value whose hex length isn't 64 chars.
    it('rejects (rather than throws) when v1 has a different byte length than the expected digest', async () => {
      const header = `t=${timestamp},v1=deadbeef`
      await expect(verifyWebhookSignature('stripe', payload, header, secret)).resolves.toBe(false)
    })

    it('accepts a Buffer payload identically to the equivalent string payload', async () => {
      const header = `t=${timestamp},v1=${validSig}`
      await expect(
        verifyWebhookSignature('stripe', Buffer.from(payload, 'utf8'), header, secret)
      ).resolves.toBe(true)
    })
  })

  describe('twilio provider', () => {
    const secret = 'twilio_secret'
    const payload = 'FromCity=City&FromState=ST'
    // Known-good vector: hmac_sha1(secret, payload).digest('base64')
    const validSig = 'xwCZkSdGXnFd5MToQXKCpHUyi+E='

    it('accepts a valid base64 sha1 signature', async () => {
      await expect(verifyWebhookSignature('twilio', payload, validSig, secret)).resolves.toBe(true)
    })

    it('rejects an invalid signature', async () => {
      await expect(verifyWebhookSignature('twilio', payload, 'not-the-right-sig', secret)).resolves.toBe(false)
    })
  })

  describe('default/generic provider (also covers "certn" — it has no dedicated case)', () => {
    const secret = 'generic_secret'
    const payload = '{"foo":"bar"}'
    // Known-good vector: hmac_sha256(secret, payload).digest('hex')
    const validSig = 'bee477855cf59ae8549666ca9970ca9c1584ce88521c85828dad83dcd14e7b1c'

    it('accepts a valid hex sha256 signature for "other"', async () => {
      await expect(verifyWebhookSignature('other', payload, validSig, secret)).resolves.toBe(true)
    })

    // NOTE: 'certn' is not one of the explicit switch cases in verifyWebhookSignature,
    // so it falls through to the generic hex-sha256 branch (same as 'other').
    // Certn's actual webhook route verifies its X-Signature HMAC separately
    // (see src/app/api/webhooks/certn) rather than through this function.
    it('accepts a valid hex sha256 signature for "certn" via the generic fallback', async () => {
      await expect(verifyWebhookSignature('certn', payload, validSig, secret)).resolves.toBe(true)
    })

    it('rejects an invalid signature', async () => {
      await expect(verifyWebhookSignature('other', payload, '0'.repeat(64), secret)).resolves.toBe(false)
    })
  })

  it('computes signatures against a freshly-derived vector too (sanity cross-check)', async () => {
    const secret = 'another_secret'
    const payload = JSON.stringify({ hello: 'world', n: 42 })
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    await expect(verifyWebhookSignature('other', payload, sig, secret)).resolves.toBe(true)
  })
})
