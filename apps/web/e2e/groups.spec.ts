import { test, expect } from './fixtures/test-fixtures'

test.describe('Groups', () => {
  test.describe('Groups List', () => {
    test('should load the groups page', async ({ page }) => {
      await page.goto('/groups')
      await expect(page).toHaveURL(/\/groups/)
    })

    test('should display groups heading', async ({ page }) => {
      await page.goto('/groups')
      await expect(page.getByText(/groups|co-renter/i).first()).toBeVisible()
    })

    test('should display create group option', async ({ page }) => {
      await page.goto('/groups')
      await expect(page.getByText(/create.*group|new group/i).first()).toBeVisible()
    })
  })
})
