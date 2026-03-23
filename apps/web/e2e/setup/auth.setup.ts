import { test as setup, expect } from '@playwright/test'
import { testUsers } from '../fixtures/test-fixtures'

const authFile = './e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Go to login page
  await page.goto('/login')

  // Fill in credentials
  await page.getByPlaceholder(/email/i).fill(testUsers.seeker.email)
  await page.getByPlaceholder(/password/i).fill(testUsers.seeker.password)

  // Click sign in
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for successful redirect to an authenticated page
  await page.waitForURL(/\/(dashboard|discover|profile|quiz|search)/, { timeout: 15000 })

  // Save the authentication state
  await page.context().storageState({ path: authFile })
})
