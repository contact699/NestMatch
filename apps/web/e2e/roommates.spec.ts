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
    // Check for any filter controls (dropdowns, selects, or filter text)
    const hasFilterText = await page.getByText(/province|city|all profiles|filter/i).first().isVisible().catch(() => false)
    const hasSelect = await page.locator('select').first().isVisible().catch(() => false)
    const hasDropdown = await page.locator('[role="combobox"], [role="listbox"]').first().isVisible().catch(() => false)
    expect(hasFilterText || hasSelect || hasDropdown).toBeTruthy()
  })

  test('should not claim AI-driven matchmaking', async ({ page }) => {
    const bodyText = await page.textContent('body') || ''
    expect(bodyText.toLowerCase()).not.toContain('ai-driven')
    // Should use "compatibility-based" if present
  })
})
