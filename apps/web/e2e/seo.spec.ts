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
})
