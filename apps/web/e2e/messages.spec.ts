import { test, expect } from './fixtures/test-fixtures'
import type { Page } from '@playwright/test'

// Skip test if not authenticated (redirected to login)
function skipIfNotAuthenticated(page: Page) {
  if (page.url().includes('/login') || page.url().includes('/signin')) {
    test.skip(true, 'Test user not authenticated')
  }
}

test.describe('Messages', () => {
  test.describe('Inbox', () => {
    test('should load the inbox page', async ({ page }) => {
      await page.goto('/messages')
      skipIfNotAuthenticated(page)
      await expect(page).toHaveURL(/\/messages/)
    })

    test('should display Inbox heading', async ({ page }) => {
      await page.goto('/messages')
      skipIfNotAuthenticated(page)
      await expect(page.getByText(/inbox/i).first()).toBeVisible()
    })

    test('should display unread count or empty state', async ({ page }) => {
      await page.goto('/messages')
      skipIfNotAuthenticated(page)
      // Either shows unread count or "no messages" empty state
      const hasMessages = await page.getByText(/unread|message/i).first().isVisible()
      const hasEmpty = await page.getByText(/no.*messages|no.*conversations|start a conversation/i).first().isVisible().catch(() => false)
      expect(hasMessages || hasEmpty).toBeTruthy()
    })

    test('should not show template artifacts', async ({ page }) => {
      await page.goto('/messages')
      skipIfNotAuthenticated(page)
      const bodyText = await page.textContent('body') || ''
      // Should NOT contain {{DATA:TEXT:TEXT_7}} or any template syntax
      expect(bodyText).not.toContain('{{')
      expect(bodyText).not.toContain('}}')
    })

    test('should have search or filter functionality', async ({ page }) => {
      await page.goto('/messages')
      skipIfNotAuthenticated(page)
      const search = page.getByPlaceholder(/search/i)
      const filter = page.getByRole('button', { name: /filter/i })
      const hasSearch = await search.isVisible().catch(() => false)
      const hasFilter = await filter.isVisible().catch(() => false)
      expect(hasSearch || hasFilter).toBeTruthy()
    })
  })
})
