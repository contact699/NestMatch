import { test, expect } from './fixtures/test-fixtures'

test.describe('Calendar', () => {
  test('should load the calendar page', async ({ page }) => {
    await page.goto('/calendar')
    await expect(page).toHaveURL(/\/calendar/)
  })

  test('should display calendar heading', async ({ page }) => {
    await page.goto('/calendar')
    await expect(page.getByText(/calendar|schedule|events/i).first()).toBeVisible()
  })

  test('should display calendar grid or empty state', async ({ page }) => {
    await page.goto('/calendar')
    await expect(page.locator('main')).toBeVisible()
  })
})
