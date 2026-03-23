import { test, expect } from './fixtures/test-fixtures'
import type { Page } from '@playwright/test'

// Skip test if not authenticated (redirected to login)
function skipIfNotAuthenticated(page: Page) {
  if (page.url().includes('/login') || page.url().includes('/signin')) {
    test.skip(true, 'Test user not authenticated')
  }
}

test.describe('Groups', () => {
  test.describe('Groups List', () => {
    test('should load the groups page', async ({ page }) => {
      await page.goto('/groups')
      skipIfNotAuthenticated(page)
      await expect(page).toHaveURL(/\/groups/)
    })

    test('should display groups heading', async ({ page }) => {
      await page.goto('/groups')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/groups|co-renter/i).first()).toBeVisible()
    })

    test('should display create group option', async ({ page }) => {
      await page.goto('/groups')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/create.*group|new group/i).first()).toBeVisible()
    })
  })
})
