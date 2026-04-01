import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should load the landing page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/NestMatch/)
  })

  test('should display the hero section with headline', async ({ page }) => {
    await page.goto('/')
    // The headline is "Find roommates you can actually trust."
    await expect(page.getByText(/find roommates you/i)).toBeVisible()
    await expect(page.getByText(/actually trust/i)).toBeVisible()
  })

  test('should display CTA buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /get started/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /find a roommate/i })).toBeVisible()
  })

  test('should display honest social proof without fake numbers', async ({ page }) => {
    await page.goto('/')
    // Should NOT contain fake large numbers like "5,000" or "10,000"
    const bodyText = await page.textContent('body')
    expect(bodyText).not.toMatch(/\b[5-9],\d{3}\b/)
    expect(bodyText).not.toMatch(/\b\d{2},\d{3}\b/)
    // Should contain honest messaging
    await expect(page.getByText(/verified|trust/i).first()).toBeVisible()
  })

  test('should display the CTA section', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/ready to find your/i)).toBeVisible()
  })

  test('should display the footer', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/privacy policy/i)).toBeVisible()
    await expect(page.getByText(/terms of service/i)).toBeVisible()
  })

  test('should have working navigation to login', async ({ page }) => {
    await page.goto('/')
    // There should be a sign in or login link
    const signInLink = page.getByRole('link', { name: /sign in|login/i }).first()
    if (await signInLink.isVisible()) {
      await signInLink.click()
      await expect(page).toHaveURL(/\/login/)
    }
  })

  test('should have working Get Started link', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /get started/i }).first().click()
    // Should navigate to signup or login
    await expect(page).toHaveURL(/\/(login|signup)/)
  })

  test('should display NestMatch branding', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('NestMatch').first()).toBeVisible()
  })
})
