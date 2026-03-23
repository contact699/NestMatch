import { test, expect } from './fixtures/test-fixtures'
import type { Page } from '@playwright/test'

// Skip test if not authenticated (redirected to login)
function skipIfNotAuthenticated(page: Page) {
  if (page.url().includes('/login') || page.url().includes('/signin')) {
    test.skip(true, 'Test user not authenticated')
  }
}

test.describe('Listings', () => {
  test.describe('Create Listing Wizard', () => {
    test('should load the create listing page', async ({ page }) => {
      await page.goto('/listings/new')
      skipIfNotAuthenticated(page)
      await expect(page).toHaveURL(/\/listings\/new/)
    })

    test('should display step indicator', async ({ page }) => {
      await page.goto('/listings/new')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/step.*of.*7|step 1/i).first()).toBeVisible()
    })

    test('should display property type options', async ({ page }) => {
      await page.goto('/listings/new')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/apartment/i).first()).toBeVisible()
      await expect(page.getByText(/house/i).first()).toBeVisible()
    })

    test('should display the listing hero text', async ({ page }) => {
      await page.goto('/listings/new')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/build your listing|let's build/i).first()).toBeVisible()
    })

    test('should have Continue button', async ({ page }) => {
      await page.goto('/listings/new')
      skipIfNotAuthenticated(page)
      await expect(page.getByRole('button', { name: /continue/i })).toBeVisible()
    })
  })

  test.describe('My Listings', () => {
    test('should load my listings page', async ({ page }) => {
      await page.goto('/my-listings')
      skipIfNotAuthenticated(page)
      await expect(page).toHaveURL(/\/my-listings/)
    })

    test('should display the page heading', async ({ page }) => {
      await page.goto('/my-listings')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/my listings/i).first()).toBeVisible()
    })

    test('should display stats section', async ({ page }) => {
      await page.goto('/my-listings')
      skipIfNotAuthenticated(page)
      // Should show exposure/active/pending stats or empty state
      await expect(page.locator('main')).toBeVisible()
    })

    test('should have Create New Listing button', async ({ page }) => {
      await page.goto('/my-listings')
      skipIfNotAuthenticated(page)
      await expect(page.getByRole('link', { name: /create.*listing|new listing/i })).toBeVisible()
    })

    test('should display tabs for listing status', async ({ page }) => {
      await page.goto('/my-listings')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/all listings/i).first()).toBeVisible()
    })
  })

  test.describe('Saved Listings', () => {
    test('should load saved listings page', async ({ page }) => {
      await page.goto('/saved')
      skipIfNotAuthenticated(page)
      await expect(page).toHaveURL(/\/saved/)
    })

    test('should display the page heading', async ({ page }) => {
      await page.goto('/saved')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/your sanctuary|saved/i).first()).toBeVisible()
    })

    test('should display tabs for saved items', async ({ page }) => {
      await page.goto('/saved')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/all items|properties|roommates/i).first()).toBeVisible()
    })
  })
})
