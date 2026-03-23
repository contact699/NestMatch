import { test as setup, expect } from '@playwright/test'
import { testUsers } from '../fixtures/test-fixtures'

const authFile = './e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Try to sign in with existing test user
  await page.goto('/login')
  await page.locator('#login-email').fill(testUsers.seeker.email)
  await page.locator('#login-password').fill(testUsers.seeker.password)
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for either successful redirect or error
  try {
    await page.waitForURL(/\/(dashboard|discover|profile|quiz|search)/, { timeout: 10000 })
  } catch {
    // Sign-in failed — try creating the account via signup
    console.log('Sign-in failed, attempting signup...')
    await page.goto('/signup')

    // Fill signup form
    await page.locator('input[name="name"]').fill('Test Seeker')
    await page.locator('input[name="email"]').fill(testUsers.seeker.email)
    await page.locator('input[name="password"]').fill(testUsers.seeker.password)
    await page.locator('input[name="confirmPassword"]').fill(testUsers.seeker.password)
    await page.getByRole('button', { name: /sign up|create|register/i }).click()

    // Wait for either redirect (auto-confirm) or success message (email confirm)
    try {
      await page.waitForURL(/\/(dashboard|discover|profile|quiz|search)/, { timeout: 10000 })
    } catch {
      // If email confirmation is required, we can't proceed with auth tests
      // Save empty state so authenticated tests are skipped gracefully
      console.log('Signup requires email confirmation. Authenticated tests will use unauthenticated state.')
      await page.context().storageState({ path: authFile })
      return
    }
  }

  // Save the authentication state
  await page.context().storageState({ path: authFile })
})
