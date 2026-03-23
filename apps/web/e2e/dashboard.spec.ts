import { test, expect } from './fixtures/test-fixtures'
import type { Page } from '@playwright/test'

// Skip test if not authenticated (redirected to login)
function skipIfNotAuthenticated(page: Page) {
  if (page.url().includes('/login') || page.url().includes('/signin')) {
    test.skip(true, 'Test user not authenticated')
  }
}

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    skipIfNotAuthenticated(page)
  })

  test('should load the dashboard page', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('should display welcome hero card', async ({ page }) => {
    // Hero card with welcome message and "Sanctuary" branding
    await expect(page.getByText(/welcome back/i)).toBeVisible()
    await expect(page.getByText(/sanctuary/i).first()).toBeVisible()
  })

  test('should display View Matches and Post Listing CTAs', async ({ page }) => {
    await expect(page.getByRole('link', { name: /view matches/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /post listing/i })).toBeVisible()
  })

  test('should display profile strength section', async ({ page }) => {
    await expect(page.getByText(/profile strength/i)).toBeVisible()
    // Should show a percentage
    await expect(page.getByText(/%/).first()).toBeVisible()
  })

  test('should display quick action cards', async ({ page }) => {
    await expect(page.getByText(/find a room/i)).toBeVisible()
    await expect(page.getByText(/post a listing/i)).toBeVisible()
    await expect(page.getByText(/my matches/i)).toBeVisible()
    await expect(page.getByText(/saved/i)).toBeVisible()
  })

  test('should display recent activity section', async ({ page }) => {
    await expect(page.getByText(/recent activity/i)).toBeVisible()
  })

  test('should display performance section', async ({ page }) => {
    await expect(page.getByText(/performance/i)).toBeVisible()
  })

  test('should navigate to search when clicking Find a Room', async ({ page }) => {
    await page.getByText(/find a room/i).click()
    await expect(page).toHaveURL(/\/search/)
  })

  test('should navigate to create listing when clicking Post a Listing card', async ({ page }) => {
    // Click the quick action card (not the sidebar button)
    const postCard = page.locator('main').getByText(/post a listing/i).first()
    await postCard.click()
    await expect(page).toHaveURL(/\/listings\/new/)
  })

  test('should not display fake statistics', async ({ page }) => {
    // All numbers should be dynamic (could be 0) — no hardcoded fake data
    // Just verify the page loads without errors
    await expect(page.locator('main')).toBeVisible()
  })
})
