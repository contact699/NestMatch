import { test, expect } from './fixtures/test-fixtures'

test.describe('Search Listings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/search')
  })

  test('should load the search page', async ({ page }) => {
    await expect(page).toHaveURL(/\/search/)
  })

  test('should display filter sidebar', async ({ page }) => {
    await expect(page.getByText(/filters/i).first()).toBeVisible()
    await expect(page.getByText(/price range/i)).toBeVisible()
    await expect(page.getByText(/property type/i)).toBeVisible()
  })

  test('should display property type filter options', async ({ page }) => {
    await expect(page.getByText(/apartment/i).first()).toBeVisible()
    await expect(page.getByText(/house/i).first()).toBeVisible()
  })

  test('should display amenities filter section', async ({ page }) => {
    await expect(page.getByText(/amenities/i)).toBeVisible()
  })

  test('should display results count', async ({ page }) => {
    // Should show "{N} Results" (dynamic)
    await expect(page.getByText(/results/i).first()).toBeVisible()
  })

  test('should display view mode options', async ({ page }) => {
    // List/Map/Proximity view tabs
    const viewModes = page.getByText(/list|map|proximity/i)
    await expect(viewModes.first()).toBeVisible()
  })

  test('should have Apply Filters button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /apply filters/i })).toBeVisible()
  })
})
