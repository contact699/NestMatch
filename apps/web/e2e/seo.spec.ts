import { test, expect } from '@playwright/test'

test.describe('SEO surfaces (anonymous)', () => {
  test('homepage returns 200 with NestMatch in the title', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/NestMatch/)
  })

  test('anonymous user can reach /search without redirect', async ({ page }) => {
    const response = await page.goto('/search', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBe(200)
    expect(page.url()).toContain('/search')
    expect(page.url()).not.toContain('/login')
  })

  test('anonymous user can reach /resources/guides without redirect', async ({ page }) => {
    const response = await page.goto('/resources/guides', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBe(200)
    expect(page.url()).toContain('/resources/guides')
    expect(page.url()).not.toContain('/login')
  })

  test('listing 404 page renders with landing nav for anonymous user', async ({ page }) => {
    await page.goto('/listings/00000000-0000-0000-0000-000000000000')
    // LandingNav has a "Discover" link; the authed Navbar does not.
    // Note: LandingNav does not have a "Get Started" link — "Discover" is the
    // unique identifier present only in the landing nav component.
    await expect(page.getByRole('link', { name: /discover/i })).toBeVisible()
  })

  test('homepage hero text is present in initial HTML (SSR)', async ({ request }) => {
    const response = await request.get('/')
    const html = await response.text()
    expect(html).toContain('live with')
  })
})
