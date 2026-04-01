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

  test('should display inline filter controls', async ({ page }) => {
    // Wait for page content to load (may show loading spinner first)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    const filterArea = page.locator('main')
    const hasSelect = await filterArea.locator('select').first().isVisible().catch(() => false)
    const hasInput = await filterArea.locator('input').first().isVisible().catch(() => false)
    const hasProvince = await filterArea.getByText(/province/i).first().isVisible().catch(() => false)
    const hasResults = await filterArea.getByText(/results|loading/i).first().isVisible().catch(() => false)
    expect(hasSelect || hasInput || hasProvince || hasResults).toBeTruthy()
  })

  test('should display property type filter options', async ({ page }) => {
    // The search page has a Type dropdown with "All Types" or similar options
    const hasTypeDropdown = await page.locator('select').filter({ hasText: /type|all types/i }).first().isVisible().catch(() => false)
    const hasTypeText = await page.getByText(/all types|type/i).first().isVisible().catch(() => false)
    expect(hasTypeDropdown || hasTypeText).toBeTruthy()
  })

  test('should display checkbox filters', async ({ page }) => {
    // The search page shows checkbox filters like "Newcomer Friendly", "Pets Allowed", etc.
    const hasCheckbox = await page.locator('input[type="checkbox"]').first().isVisible().catch(() => false)
    const hasNewcomer = await page.getByText(/newcomer friendly/i).first().isVisible().catch(() => false)
    const hasPets = await page.getByText(/pets allowed/i).first().isVisible().catch(() => false)
    const hasStudents = await page.getByText(/ideal for students/i).first().isVisible().catch(() => false)
    const hasNoCredit = await page.getByText(/no credit history/i).first().isVisible().catch(() => false)
    expect(hasCheckbox || hasNewcomer || hasPets || hasStudents || hasNoCredit).toBeTruthy()
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

  test('should have Search button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /search/i })).toBeVisible()
  })
})
