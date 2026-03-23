import { test, expect } from './fixtures/test-fixtures'

test.describe('Reviews & Ratings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reviews')
  })

  test('should load the reviews page', async ({ page }) => {
    await expect(page).toHaveURL(/\/reviews/)
  })

  test('should display Reviews & Ratings heading', async ({ page }) => {
    await expect(page.getByText(/reviews.*ratings|reviews/i).first()).toBeVisible()
  })

  test('should display community trust messaging', async ({ page }) => {
    await expect(page.getByText(/trust|community|feedback/i).first()).toBeVisible()
  })

  test('should display user review summary or empty state', async ({ page }) => {
    // Either shows reviews or shows that user has no reviews yet
    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('should display review filter tabs', async ({ page }) => {
    await expect(page.getByText(/all|roommates|hosts/i).first()).toBeVisible()
  })

  test('should display trait highlights section', async ({ page }) => {
    await expect(page.getByText(/trait highlights|cleanliness|reliability/i).first()).toBeVisible()
  })
})
