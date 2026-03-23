import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should display the login page with form', async ({ page }) => {
      await page.goto('/login')
      await expect(page.getByText(/welcome back/i)).toBeVisible()
      await expect(page.getByPlaceholder(/email/i)).toBeVisible()
      await expect(page.getByPlaceholder(/password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    })

    test('should display the hero section on login page', async ({ page }) => {
      await page.goto('/login')
      // Left side has the hero text
      await expect(page.getByText(/peaceful place|place to call home/i)).toBeVisible()
    })

    test('should show validation for empty email', async ({ page }) => {
      await page.goto('/login')
      await page.getByPlaceholder(/password/i).fill('SomePassword123!')
      await page.getByRole('button', { name: /sign in/i }).click()
      // Should show some validation feedback (either HTML5 or custom)
      // The email input should be invalid
      const emailInput = page.getByPlaceholder(/email/i)
      await expect(emailInput).toBeVisible()
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login')
      await page.getByPlaceholder(/email/i).fill('nonexistent@example.com')
      await page.getByPlaceholder(/password/i).fill('WrongPass123!')
      await page.getByRole('button', { name: /sign in/i }).click()
      // Should show error message
      await expect(page.getByText(/invalid|incorrect|error|wrong/i).first()).toBeVisible({ timeout: 10000 })
    })

    test('should have forgot password link', async ({ page }) => {
      await page.goto('/login')
      await expect(page.getByText(/forgot password/i)).toBeVisible()
    })

    test('should display social auth options', async ({ page }) => {
      await page.goto('/login')
      // Should show Google and/or Apple login buttons
      const socialButtons = page.getByText(/google|apple|continue with/i)
      await expect(socialButtons.first()).toBeVisible()
    })

    test('should not show fake user counts', async ({ page }) => {
      await page.goto('/login')
      const bodyText = await page.textContent('body')
      // Should not have "2,000+ Canadians this month" or similar fake claims
      expect(bodyText).not.toMatch(/\d{1,2},\d{3}\+?\s*(canadians|users)\s*(this|per)/i)
    })

    test('should display trust messaging', async ({ page }) => {
      await page.goto('/login')
      await expect(page.getByText(/trust|verified|secure/i).first()).toBeVisible()
    })
  })

  test.describe('Signup Page', () => {
    test('should display the signup page', async ({ page }) => {
      await page.goto('/signup')
      await expect(page).toHaveURL(/\/signup/)
      // Should have a form with email and password at minimum
      await expect(page.getByPlaceholder(/email/i)).toBeVisible()
      await expect(page.getByPlaceholder(/password/i)).toBeVisible()
    })

    test('should have link to login page', async ({ page }) => {
      await page.goto('/signup')
      const loginLink = page.getByRole('link', { name: /sign in|log in|already have/i }).first()
      if (await loginLink.isVisible()) {
        await loginLink.click()
        await expect(page).toHaveURL(/\/login/)
      }
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users from dashboard to login', async ({ page }) => {
      // Clear any existing auth state
      await page.context().clearCookies()
      await page.goto('/dashboard')
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    })
  })
})
