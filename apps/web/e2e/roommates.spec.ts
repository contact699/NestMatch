import { test, expect } from './fixtures/test-fixtures'

test.describe('Find Roommates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/roommates')
  })

  test('should load the roommates page', async ({ page }) => {
    await expect(page).toHaveURL(/\/roommates/)
  })

  test('should display the page heading', async ({ page }) => {
    await expect(page.getByText(/find your sanctuary|find roommates/i).first()).toBeVisible()
  })

  test('should display search functionality', async ({ page }) => {
    await expect(page.getByPlaceholder(/search|name|city/i).first()).toBeVisible()
  })

  test('should display filter options', async ({ page }) => {
    // Province and other filter dropdowns
    const filters = page.getByText(/province|city|all profiles/i)
    await expect(filters.first()).toBeVisible()
  })

  test('should not claim AI-driven matchmaking', async ({ page }) => {
    const bodyText = await page.textContent('body') || ''
    expect(bodyText.toLowerCase()).not.toContain('ai-driven')
    // Should use "compatibility-based" if present
  })
})
