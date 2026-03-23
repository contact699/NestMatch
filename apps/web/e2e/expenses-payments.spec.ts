import { test, expect } from './fixtures/test-fixtures'

test.describe('Expenses & Payments', () => {
  test.describe('Expenses', () => {
    test('should load the expenses page', async ({ page }) => {
      await page.goto('/expenses')
      await expect(page).toHaveURL(/\/expenses/)
    })

    test('should display House Expenses heading', async ({ page }) => {
      await page.goto('/expenses')
      await expect(page.getByText(/house expenses|expenses/i).first()).toBeVisible()
    })

    test('should display Add Expense button', async ({ page }) => {
      await page.goto('/expenses')
      await expect(page.getByRole('button', { name: /add expense/i })).toBeVisible()
    })

    test('should display balance section', async ({ page }) => {
      await page.goto('/expenses')
      await expect(page.getByText(/balance|total/i).first()).toBeVisible()
    })
  })

  test.describe('Payment History', () => {
    test('should load the payments page', async ({ page }) => {
      await page.goto('/payments')
      await expect(page).toHaveURL(/\/payments/)
    })

    test('should display Payment History heading', async ({ page }) => {
      await page.goto('/payments')
      await expect(page.getByText(/payment history/i).first()).toBeVisible()
    })

    test('should display filter options', async ({ page }) => {
      await page.goto('/payments')
      await expect(page.getByText(/date range|transaction type/i).first()).toBeVisible()
    })
  })

  test.describe('Payment Methods', () => {
    test('should load payment methods page', async ({ page }) => {
      await page.goto('/settings/payments')
      await expect(page).toHaveURL(/\/settings\/payments/)
    })

    test('should display Payment Methods heading', async ({ page }) => {
      await page.goto('/settings/payments')
      await expect(page.getByText(/payment methods/i).first()).toBeVisible()
    })

    test('should use correct encryption standard (AES-256)', async ({ page }) => {
      await page.goto('/settings/payments')
      const bodyText = await page.textContent('body') || ''
      expect(bodyText).not.toContain('ALS-256')
      if (bodyText.includes('256')) {
        expect(bodyText).toContain('AES-256')
      }
    })

    test('should display Add New Card option', async ({ page }) => {
      await page.goto('/settings/payments')
      await expect(page.getByText(/add.*card|add.*method/i).first()).toBeVisible()
    })
  })
})
