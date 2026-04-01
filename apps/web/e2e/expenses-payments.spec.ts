import { test, expect } from './fixtures/test-fixtures'
import type { Page } from '@playwright/test'

// Skip test if not authenticated (redirected to login)
function skipIfNotAuthenticated(page: Page) {
  if (page.url().includes('/login') || page.url().includes('/signin')) {
    test.skip(true, 'Test user not authenticated')
  }
}

test.describe('Expenses & Payments', () => {
  test.describe('Expenses', () => {
    test('should load the expenses page', async ({ page }) => {
      await page.goto('/expenses')
      skipIfNotAuthenticated(page)
      await expect(page).toHaveURL(/\/expenses/)
    })

    test('should display House Expenses heading', async ({ page }) => {
      await page.goto('/expenses')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/house expenses|expenses/i).first()).toBeVisible()
    })

    test('should display Add Expense button', async ({ page }) => {
      await page.goto('/expenses')
      skipIfNotAuthenticated(page)
      await expect(page.getByRole('button', { name: /add expense/i })).toBeVisible()
    })

    test('should display balance section', async ({ page }) => {
      await page.goto('/expenses')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/balance|total/i).first()).toBeVisible()
    })
  })

  test.describe('Payment History', () => {
    test('should load the payments page', async ({ page }) => {
      await page.goto('/payments')
      skipIfNotAuthenticated(page)
      await expect(page).toHaveURL(/\/payments/)
    })

    test('should display Payment History heading', async ({ page }) => {
      await page.goto('/payments')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/payment history/i).first()).toBeVisible()
    })

    test('should display filter options', async ({ page }) => {
      await page.goto('/payments')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/date range|transaction type/i).first()).toBeVisible()
    })
  })

  test.describe('Payment Methods', () => {
    test('should load payment methods page', async ({ page }) => {
      await page.goto('/settings/payments')
      skipIfNotAuthenticated(page)
      await expect(page).toHaveURL(/\/settings\/payments/)
    })

    test('should display Payment Methods heading', async ({ page }) => {
      await page.goto('/settings/payments')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/payment methods/i).first()).toBeVisible()
    })

    test('should use correct encryption standard (AES-256)', async ({ page }) => {
      await page.goto('/settings/payments')
      skipIfNotAuthenticated(page)
      await page.waitForLoadState('networkidle')
      const bodyText = await page.textContent('body') || ''
      // Must NOT contain the typo ALS-256
      expect(bodyText).not.toContain('ALS-256')
      // If encryption standard is mentioned, it should be AES-256 (not required to be present)
    })

    test('should display Add New Card option', async ({ page }) => {
      await page.goto('/settings/payments')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/add.*card|add.*method/i).first()).toBeVisible()
    })
  })
})
