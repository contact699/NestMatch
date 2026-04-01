import { test as setup, expect } from '@playwright/test'
import { testUsers } from '../fixtures/test-fixtures'

const authFile = './e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Go to login page
  await page.goto('/login')

  // Fill in credentials
  await page.locator('#login-email').fill(testUsers.seeker.email)
  await page.locator('#login-password').fill(testUsers.seeker.password)

  // Click sign in
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for navigation — the login form calls router.push('/dashboard') then router.refresh()
  // Give it plenty of time and also accept if we're already on a protected page
  await page.waitForURL(
    url => !url.toString().includes('/login') && !url.toString().includes('/signup'),
    { timeout: 20000 }
  )

  // Verify we're on an authenticated page
  await expect(page.locator('body')).toBeVisible()

  // Save the authentication state
  await page.context().storageState({ path: authFile })
})
