import { test, expect } from './fixtures/test-fixtures'
import type { Page } from '@playwright/test'

// Skip test if not authenticated (redirected to login)
function skipIfNotAuthenticated(page: Page) {
  if (page.url().includes('/login') || page.url().includes('/signin')) {
    test.skip(true, 'Test user not authenticated')
  }
}

test.describe('Trust Center', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/verify')
    skipIfNotAuthenticated(page)
  })

  test('should load the trust center page', async ({ page }) => {
    await expect(page).toHaveURL(/\/verify/)
  })

  test('should display Trust Center heading', async ({ page }) => {
    await expect(page.getByText(/trust center/i).first()).toBeVisible()
  })

  test('should display verification cards', async ({ page }) => {
    // Should show phone, identity, credit, criminal check cards
    await expect(page.getByText(/phone/i).first()).toBeVisible()
    await expect(page.getByText(/identity|government id/i).first()).toBeVisible()
    await expect(page.getByText(/credit/i).first()).toBeVisible()
  })

  test('should display trust quotient', async ({ page }) => {
    await expect(page.getByText(/trust quotient|trust score/i).first()).toBeVisible()
  })

  test('should not mention AI biometrics', async ({ page }) => {
    const bodyText = await page.textContent('body') || ''
    expect(bodyText.toLowerCase()).not.toContain('ai biometric')
  })

  test('should use correct encryption standard', async ({ page }) => {
    const bodyText = await page.textContent('body') || ''
    // Should NOT have ALS-256, should have AES-256 if encryption is mentioned
    expect(bodyText).not.toContain('ALS-256')
  })

  test('should display Why Verification Matters section', async ({ page }) => {
    await expect(page.getByText(/why verification matters|need more trust/i).first()).toBeVisible()
  })
})
