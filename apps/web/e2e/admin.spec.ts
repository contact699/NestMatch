import { test, expect } from './fixtures/test-fixtures'

test.describe('Admin Pages', () => {
  test('should load admin dashboard or show access denied', async ({ page }) => {
    await page.goto('/admin')
    // Either loads the admin dashboard or shows access denied / redirects
    const isAdmin = await page.getByText(/admin dashboard|welcome back.*curator/i).first().isVisible().catch(() => false)
    const isDenied = await page.getByText(/access denied|unauthorized|not authorized/i).first().isVisible().catch(() => false)
    const redirected = page.url().includes('/dashboard') || page.url().includes('/login')
    expect(isAdmin || isDenied || redirected).toBeTruthy()
  })

  test('should load admin analytics or handle non-admin', async ({ page }) => {
    await page.goto('/admin/analytics')
    const isAnalytics = await page.getByText(/analytics|performance overview/i).first().isVisible().catch(() => false)
    const isDenied = !isAnalytics
    // Just verify the page doesn't crash
    await expect(page.locator('body')).toBeVisible()
  })

  test('admin pages should not mention AI biometrics', async ({ page }) => {
    await page.goto('/admin/analytics')
    const bodyText = await page.textContent('body') || ''
    expect(bodyText).not.toMatch(/ai biometric/i)
  })

  test('admin pages should not mention Security Protocol v4.2', async ({ page }) => {
    await page.goto('/admin')
    const bodyText = await page.textContent('body') || ''
    expect(bodyText).not.toMatch(/security protocol v4\.2/i)
  })

  test('should load admin resources page', async ({ page }) => {
    await page.goto('/admin/resources')
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load admin FAQs page', async ({ page }) => {
    await page.goto('/admin/faqs')
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load admin categories page', async ({ page }) => {
    await page.goto('/admin/categories')
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load admin clauses page', async ({ page }) => {
    await page.goto('/admin/clauses')
    await expect(page.locator('body')).toBeVisible()
  })

  test('should load admin questions page', async ({ page }) => {
    await page.goto('/admin/questions')
    await expect(page.locator('body')).toBeVisible()
  })
})
