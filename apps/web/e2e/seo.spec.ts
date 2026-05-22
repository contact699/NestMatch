import { test, expect } from '@playwright/test'

test.describe('SEO surfaces (anonymous)', () => {
  test('homepage returns 200 with NestMatch in the title', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/NestMatch/)
  })
})
