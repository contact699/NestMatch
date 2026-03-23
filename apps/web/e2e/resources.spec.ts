import { test, expect } from './fixtures/test-fixtures'
import type { Page } from '@playwright/test'

// Skip test if not authenticated (redirected to login)
function skipIfNotAuthenticated(page: Page) {
  if (page.url().includes('/login') || page.url().includes('/signin')) {
    test.skip(true, 'Test user not authenticated')
  }
}

test.describe('Resources', () => {
  test.describe('Resources Hub', () => {
    test('should load the resources hub', async ({ page }) => {
      await page.goto('/resources')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/resources hub/i).first()).toBeVisible()
    })

    test('should display featured tools', async ({ page }) => {
      await page.goto('/resources')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/calculator|checklist|tools/i).first()).toBeVisible()
    })

    test('should display knowledge base categories', async ({ page }) => {
      await page.goto('/resources')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/legal rights|insurance|contracts|credit/i).first()).toBeVisible()
    })

    test('should not claim 24/7 concierge service', async ({ page }) => {
      await page.goto('/resources')
      skipIfNotAuthenticated(page)
      const bodyText = await page.textContent('body') || ''
      expect(bodyText).not.toMatch(/24\/7.*concierge/i)
    })
  })

  test.describe('FAQ', () => {
    test('should load the FAQ page', async ({ page }) => {
      await page.goto('/resources/faq')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/frequently asked questions/i).first()).toBeVisible()
    })

    test('should display category filters', async ({ page }) => {
      await page.goto('/resources/faq')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/general|privacy|payments/i).first()).toBeVisible()
    })

    test('should have search functionality', async ({ page }) => {
      await page.goto('/resources/faq')
      skipIfNotAuthenticated(page)
      await expect(page.getByPlaceholder(/search/i).first()).toBeVisible()
    })

    test('should not mention Verified Rent Guarantee', async ({ page }) => {
      await page.goto('/resources/faq')
      skipIfNotAuthenticated(page)
      const bodyText = await page.textContent('body') || ''
      expect(bodyText).not.toMatch(/verified rent guarantee/i)
    })

    test('should use AES-256 not ALS-256', async ({ page }) => {
      await page.goto('/resources/faq')
      skipIfNotAuthenticated(page)
      const bodyText = await page.textContent('body') || ''
      expect(bodyText).not.toContain('ALS-256')
    })
  })

  test.describe('Guides', () => {
    test('should load the guides page', async ({ page }) => {
      await page.goto('/resources/guides')
      skipIfNotAuthenticated(page)
      await expect(page).toHaveURL(/\/resources\/guides/)
    })
  })

  test.describe('Rent Calculator', () => {
    test('should load the rent calculator', async ({ page }) => {
      await page.goto('/resources/tools/rent-calculator')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/fair share calculator|rent.*calculator/i).first()).toBeVisible()
    })

    test('should display total rent input', async ({ page }) => {
      await page.goto('/resources/tools/rent-calculator')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/total.*rent|property rent/i).first()).toBeVisible()
    })

    test('should display room definition section', async ({ page }) => {
      await page.goto('/resources/tools/rent-calculator')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/room|sanctuary/i).first()).toBeVisible()
    })

    test('should display split breakdown', async ({ page }) => {
      await page.goto('/resources/tools/rent-calculator')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/split.*breakdown|breakdown/i).first()).toBeVisible()
    })
  })

  test.describe('Move-In Checklist', () => {
    test('should load the checklist page', async ({ page }) => {
      await page.goto('/resources/tools/move-in-checklist')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/move-in checklist|checklist/i).first()).toBeVisible()
    })

    test('should display progress indicator', async ({ page }) => {
      await page.goto('/resources/tools/move-in-checklist')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/progress|complete/i).first()).toBeVisible()
    })

    test('should display phase sections', async ({ page }) => {
      await page.goto('/resources/tools/move-in-checklist')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/before moving|move-in day|first week/i).first()).toBeVisible()
    })

    test('should have print/export options', async ({ page }) => {
      await page.goto('/resources/tools/move-in-checklist')
      skipIfNotAuthenticated(page)
      await expect(page.getByRole('button', { name: /print|export/i }).first()).toBeVisible()
    })
  })

  test.describe('Agreement Generator', () => {
    test('should load the agreement page', async ({ page }) => {
      await page.goto('/resources/agreement')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/agreement|create agreement/i).first()).toBeVisible()
    })

    test('should display step navigation', async ({ page }) => {
      await page.goto('/resources/agreement')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/basics|financials|house rules|review/i).first()).toBeVisible()
    })

    test('should not mention Live Concierge', async ({ page }) => {
      await page.goto('/resources/agreement')
      skipIfNotAuthenticated(page)
      const bodyText = await page.textContent('body') || ''
      expect(bodyText).not.toMatch(/live concierge/i)
    })
  })

  test.describe('Bookmarks', () => {
    test('should load bookmarks page', async ({ page }) => {
      await page.goto('/resources/bookmarks')
      skipIfNotAuthenticated(page)
      await expect(page).toHaveURL(/\/resources\/bookmarks/)
    })
  })

  test.describe('Submit Question', () => {
    test('should load submit question page', async ({ page }) => {
      await page.goto('/resources/submit-question')
      skipIfNotAuthenticated(page)
      await expect(page).toHaveURL(/\/resources\/submit-question/)
    })
  })

  test.describe('Tools Hub', () => {
    test('should load tools hub page', async ({ page }) => {
      await page.goto('/resources/tools')
      skipIfNotAuthenticated(page)
      await expect(page).toHaveURL(/\/resources\/tools/)
    })
  })
})
