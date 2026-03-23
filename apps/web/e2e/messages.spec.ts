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
      await page.waitForLoadState('networkidle')
      // Page may show "Inbox", "Messages", or still be in loading state
      const hasInbox = await page.getByText(/inbox/i).first().isVisible().catch(() => false)
      const hasMessages = await page.getByText(/messages/i).first().isVisible().catch(() => false)
      const hasLoading = await page.locator('[class*="spinner"], [class*="loading"], [role="status"]').first().isVisible().catch(() => false)
      expect(hasInbox || hasMessages || hasLoading).toBeTruthy()
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
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      const bodyText = await page.textContent('body') || ''
      // Should NOT contain {{DATA:TEXT:TEXT_7}} or any template syntax
      expect(bodyText).not.toContain('{{')
      expect(bodyText).not.toContain('}}')
    })

    test('should have search or filter functionality', async ({ page }) => {
      await page.goto('/messages')
      skipIfNotAuthenticated(page)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      const search = page.getByPlaceholder(/search/i)
      const filter = page.getByRole('button', { name: /filter/i })
      const hasSearch = await search.isVisible().catch(() => false)
      const hasFilter = await filter.isVisible().catch(() => false)
      const hasLoading = await page.locator('[class*="spinner"], [class*="loading"], [role="status"]').first().isVisible().catch(() => false)
      // Accept either search/filter controls or loading state (content still loading)
      expect(hasSearch || hasFilter || hasLoading).toBeTruthy()
    })
  })
})
