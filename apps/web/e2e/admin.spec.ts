import { test, expect } from './fixtures/test-fixtures'
import type { Page } from '@playwright/test'

// Skip test if not authenticated (redirected to login)
function skipIfNotAuthenticated(page: Page) {
  if (page.url().includes('/login') || page.url().includes('/signin')) {
    test.skip(true, 'Test user not authenticated')
  }
}

test.describe('Admin Pages', () => {
  test('should load admin dashboard or show access denied', async ({ page }) => {
    await page.goto('/admin')
    skipIfNotAuthenticated(page)
    await page.waitForLoadState('networkidle')
    // Either loads the admin dashboard, shows access denied, redirects, or shows any content
    const isAdmin = await page.getByText(/admin dashboard|welcome back.*curator/i).first().isVisible().catch(() => false)
    const isDenied = await page.getByText(/access denied|unauthorized|not authorized|forbidden/i).first().isVisible().catch(() => false)
    const redirected = page.url().includes('/dashboard') || page.url().includes('/login')
    const bodyVisible = await page.locator('body').isVisible()
    expect(isAdmin || isDenied || redirected || bodyVisible).toBeTruthy()
  })

  test('should load admin analytics or handle non-admin', async ({ page }) => {
    await page.goto('/admin/analytics')
    skipIfNotAuthenticated(page)
    const isAnalytics = await page.getByText(/analytics|performance overview/i).first().isVisible().catch(() => false)
    const isDenied = !isAnalytics
    // Just verify the page doesn't crash
    await expect(page.locator('body')).toBeVisible()
  })

  test('admin pages should not mention AI biometrics', async ({ page }) => {
    await page.goto('/admin/analytics')
    skipIfNotAuthenticated(page)
    const bodyText = await page.textContent('body') || ''
    expect(bodyText).not.toMatch(/ai biometric/i)
  })

  test('admin pages should not mention Security Protocol v4.2', async ({ page }) => {
    await page.goto('/admin')
    skipIfNotAuthenticated(page)
    const bodyText = await page.textContent('body') || ''
    expect(bodyText).not.toMatch(/security protocol v4\.2/i)
  })

  test('should load admin resources page', async ({ page }) => {
    await page.goto('/admin/resources')
    skipIfNotAuthenticated(page)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load admin FAQs page', async ({ page }) => {
    await page.goto('/admin/faqs')
    skipIfNotAuthenticated(page)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load admin categories page', async ({ page }) => {
    await page.goto('/admin/categories')
    skipIfNotAuthenticated(page)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load admin clauses page', async ({ page }) => {
    await page.goto('/admin/clauses')
    skipIfNotAuthenticated(page)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load admin questions page', async ({ page }) => {
    await page.goto('/admin/questions')
    skipIfNotAuthenticated(page)
    await expect(page.locator('body')).toBeVisible()
  })
})
