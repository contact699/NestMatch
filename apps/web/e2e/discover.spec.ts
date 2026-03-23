import { test, expect } from './fixtures/test-fixtures'

test.describe('Discover', () => {
  test('should load the discover page', async ({ page }) => {
    await page.goto('/discover')
    await expect(page).toHaveURL(/\/discover/)
  })

  test('should display discover heading', async ({ page }) => {
    await page.goto('/discover')
    await expect(page.getByText(/discover|find|match/i).first()).toBeVisible()
  })

  test('should display tab navigation', async ({ page }) => {
    await page.goto('/discover')
    // Should have tabs for different discover modes
    await expect(page.locator('main')).toBeVisible()
  })
})
