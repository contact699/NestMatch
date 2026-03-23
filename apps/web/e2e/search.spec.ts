import { test, expect } from './fixtures/test-fixtures'
import type { Page } from '@playwright/test'

// Skip test if not authenticated (redirected to login)
function skipIfNotAuthenticated(page: Page) {
  if (page.url().includes('/login') || page.url().includes('/signin')) {
    test.skip(true, 'Test user not authenticated')
  }
}

test.describe('Search Listings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/search')
    skipIfNotAuthenticated(page)
  })

  test('should load the search page', async ({ page }) => {
    await expect(page).toHaveURL(/\/search/)
  })

  test('should display filter sidebar', async ({ page }) => {
    await expect(page.getByText(/filters/i).first()).toBeVisible()
    await expect(page.getByText(/price range/i)).toBeVisible()
    await expect(page.getByText(/property type/i)).toBeVisible()
  })

  test('should display property type filter options', async ({ page }) => {
    await expect(page.getByText(/apartment/i).first()).toBeVisible()
    await expect(page.getByText(/house/i).first()).toBeVisible()
  })

  test('should display amenities filter section', async ({ page }) => {
    await expect(page.getByText(/amenities/i)).toBeVisible()
  })

  test('should display results count', async ({ page }) => {
    // Should show "{N} Results" (dynamic)
    await expect(page.getByText(/results/i).first()).toBeVisible()
  })

  test('should display view mode options', async ({ page }) => {
    // List/Map/Proximity view tabs
    const viewModes = page.getByText(/list|map|proximity/i)
    await expect(viewModes.first()).toBeVisible()
  })

  test('should have Apply Filters button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /apply filters/i })).toBeVisible()
  })
})
