import { test, expect } from './fixtures/test-fixtures'
import type { Page } from '@playwright/test'

// Skip test if not authenticated (redirected to login)
function skipIfNotAuthenticated(page: Page) {
  if (page.url().includes('/login') || page.url().includes('/signin')) {
    test.skip(true, 'Test user not authenticated')
  }
}

test.describe('Find Roommates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/roommates')
    skipIfNotAuthenticated(page)
  })

  test('should load the roommates page', async ({ page }) => {
    await expect(page).toHaveURL(/\/roommates/)
  })

  test('should display the page heading', async ({ page }) => {
    await expect(page.getByText(/find your sanctuary|find roommates/i).first()).toBeVisible()
  })

  test('should display search functionality', async ({ page }) => {
    // Check for any search input (text or search type)
    const searchInput = page.locator('input[type="text"], input[type="search"], input[placeholder]').first()
    await expect(searchInput).toBeVisible()
  })

  test('should display filter options', async ({ page }) => {
    // Province and other filter dropdowns
    const filters = page.getByText(/province|city|all profiles/i)
    await expect(filters.first()).toBeVisible()
  })

  test('should not claim AI-driven matchmaking', async ({ page }) => {
    const bodyText = await page.textContent('body') || ''
    expect(bodyText.toLowerCase()).not.toContain('ai-driven')
    // Should use "compatibility-based" if present
  })
})
