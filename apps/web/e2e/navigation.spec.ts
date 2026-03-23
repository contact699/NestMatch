import { test, expect } from './fixtures/test-fixtures'
import type { Page } from '@playwright/test'

// Skip test if not authenticated (redirected to login)
function skipIfNotAuthenticated(page: Page) {
  if (page.url().includes('/login') || page.url().includes('/signin')) {
    test.skip(true, 'Test user not authenticated')
  }
}

test.describe('Navigation', () => {
  test.describe('Sidebar', () => {
    test('should display sidebar with nav items', async ({ page }) => {
      await page.goto('/dashboard')
      skipIfNotAuthenticated(page)
      const sidebar = page.locator('aside').first()
      await expect(sidebar.getByText('Dashboard')).toBeVisible()
      await expect(sidebar.getByText('Discover')).toBeVisible()
      await expect(sidebar.getByText('Messages')).toBeVisible()
      await expect(sidebar.getByText('My Listings')).toBeVisible()
      await expect(sidebar.getByText('Saved')).toBeVisible()
      await expect(sidebar.getByText('Trust Center')).toBeVisible()
    })

    test('should display Post a Listing button', async ({ page }) => {
      await page.goto('/dashboard')
      skipIfNotAuthenticated(page)
      const sidebar = page.locator('aside').first()
      await expect(sidebar.getByText(/post a listing/i)).toBeVisible()
    })

    test('should navigate to search via sidebar Discover link', async ({ page }) => {
      await page.goto('/dashboard')
      skipIfNotAuthenticated(page)
      await page.locator('aside').getByText('Discover').click()
      await expect(page).toHaveURL(/\/search/)
    })

    test('should navigate to messages via sidebar', async ({ page }) => {
      await page.goto('/dashboard')
      skipIfNotAuthenticated(page)
      await page.locator('aside').getByText('Messages').click()
      await expect(page).toHaveURL(/\/messages/)
    })

    test('should navigate to my listings via sidebar', async ({ page }) => {
      await page.goto('/dashboard')
      skipIfNotAuthenticated(page)
      await page.locator('aside').getByText('My Listings').click()
      await expect(page).toHaveURL(/\/my-listings/)
    })

    test('should navigate to saved via sidebar', async ({ page }) => {
      await page.goto('/dashboard')
      skipIfNotAuthenticated(page)
      await page.locator('aside').getByText('Saved').click()
      await expect(page).toHaveURL(/\/saved/)
    })

    test('should navigate to trust center via sidebar', async ({ page }) => {
      await page.goto('/dashboard')
      skipIfNotAuthenticated(page)
      await page.locator('aside').getByText('Trust Center').click()
      await expect(page).toHaveURL(/\/verify/)
    })
  })

  test.describe('Top Navbar', () => {
    test('should display NestMatch logo', async ({ page }) => {
      await page.goto('/dashboard')
      skipIfNotAuthenticated(page)
      await expect(page.locator('nav').getByText('NestMatch').first()).toBeVisible()
    })

    test('should display user profile button', async ({ page }) => {
      await page.goto('/dashboard')
      skipIfNotAuthenticated(page)
      // There should be some profile/avatar button in the navbar
      const nav = page.locator('nav')
      const buttons = nav.getByRole('button')
      await expect(buttons.last()).toBeVisible()
    })

    test('should open profile dropdown on click', async ({ page }) => {
      await page.goto('/dashboard')
      skipIfNotAuthenticated(page)
      const nav = page.locator('nav')
      await nav.getByRole('button').last().click()
      // Should show dropdown with Profile, Settings, Sign out options
      await expect(page.getByText(/profile/i)).toBeVisible()
      await expect(page.getByText(/sign out/i)).toBeVisible()
    })
  })
})
