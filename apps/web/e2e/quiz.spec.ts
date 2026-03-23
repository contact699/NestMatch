import { test, expect } from './fixtures/test-fixtures'

test.describe('Lifestyle Quiz', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/quiz')
  })

  test('should load the quiz page', async ({ page }) => {
    await expect(page).toHaveURL(/\/quiz/)
  })

  test('should display quiz heading', async ({ page }) => {
    await expect(page.getByText(/discover your|lifestyle|perfect sanctuary/i).first()).toBeVisible()
  })

  test('should display quiz questions', async ({ page }) => {
    // Should show at least one question about daily rhythm, noise, cleanliness, etc.
    await expect(page.getByText(/daily rhythm|noise|cleanliness|social/i).first()).toBeVisible()
  })

  test('should display answer options', async ({ page }) => {
    // Should show selectable options like Early Riser, Night Owl, etc.
    await expect(page.getByText(/early riser|night owl|flexible/i).first()).toBeVisible()
  })

  test('should have navigation buttons', async ({ page }) => {
    // Should have Next/Continue button
    await expect(page.getByRole('button', { name: /next|continue|save/i }).first()).toBeVisible()
  })

  test('should display progress indicator', async ({ page }) => {
    // Step progress or dots
    await expect(page.getByText(/step|lifestyle alignment/i).first()).toBeVisible()
  })
})
