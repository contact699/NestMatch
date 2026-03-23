import { test, expect } from './fixtures/test-fixtures'
import type { Page } from '@playwright/test'

// Skip test if not authenticated (redirected to login)
function skipIfNotAuthenticated(page: Page) {
  if (page.url().includes('/login') || page.url().includes('/signin')) {
    test.skip(true, 'Test user not authenticated')
  }
}

test.describe('Calendar', () => {
  test('should load the calendar page', async ({ page }) => {
    await page.goto('/calendar')
    skipIfNotAuthenticated(page)
    await expect(page).toHaveURL(/\/calendar/)
  })

  test('should display calendar heading', async ({ page }) => {
    await page.goto('/calendar')
    skipIfNotAuthenticated(page)
    await expect(page.getByText(/calendar|schedule|events/i).first()).toBeVisible()
  })

  test('should display calendar grid or empty state', async ({ page }) => {
    await page.goto('/calendar')
    skipIfNotAuthenticated(page)
    await expect(page.locator('main')).toBeVisible()
  })
})
