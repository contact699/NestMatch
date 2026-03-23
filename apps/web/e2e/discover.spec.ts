import { test, expect } from './fixtures/test-fixtures'
import type { Page } from '@playwright/test'

// Skip test if not authenticated (redirected to login)
function skipIfNotAuthenticated(page: Page) {
  if (page.url().includes('/login') || page.url().includes('/signin')) {
    test.skip(true, 'Test user not authenticated')
  }
}

test.describe('Discover', () => {
  test('should load the discover page', async ({ page }) => {
    await page.goto('/discover')
    skipIfNotAuthenticated(page)
    await expect(page).toHaveURL(/\/discover/)
  })

  test('should display discover heading', async ({ page }) => {
    await page.goto('/discover')
    skipIfNotAuthenticated(page)
    await expect(page.getByText(/discover|find|match/i).first()).toBeVisible()
  })

  test('should display tab navigation', async ({ page }) => {
    await page.goto('/discover')
    skipIfNotAuthenticated(page)
    // Should have tabs for different discover modes
    await expect(page.locator('main')).toBeVisible()
  })
})
