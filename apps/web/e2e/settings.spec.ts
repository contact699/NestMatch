import { test, expect } from './fixtures/test-fixtures'
import type { Page } from '@playwright/test'

// Skip test if not authenticated (redirected to login)
function skipIfNotAuthenticated(page: Page) {
  if (page.url().includes('/login') || page.url().includes('/signin')) {
    test.skip(true, 'Test user not authenticated')
  }
}

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings')
    skipIfNotAuthenticated(page)
  })

  test('should load settings page', async ({ page }) => {
    await expect(page).toHaveURL(/\/settings/)
  })

  test('should display settings heading', async ({ page }) => {
    await expect(page.getByText(/settings/i).first()).toBeVisible()
  })

  test('should display account section', async ({ page }) => {
    await expect(page.getByText(/account|email|password/i).first()).toBeVisible()
  })

  test('should display blocked users section', async ({ page }) => {
    await expect(page.getByText(/blocked/i).first()).toBeVisible()
  })

  test('should display danger zone / delete account', async ({ page }) => {
    await expect(page.getByText(/delete.*account|danger/i).first()).toBeVisible()
  })
})
