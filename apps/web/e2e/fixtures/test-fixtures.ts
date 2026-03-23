import { test as base, expect, type Page } from '@playwright/test'

export const testUsers = {
  seeker: {
    email: process.env.TEST_SEEKER_EMAIL || 'test-seeker@example.com',
    password: process.env.TEST_SEEKER_PASSWORD || 'TestPassword123!',
  },
  landlord: {
    email: process.env.TEST_LANDLORD_EMAIL || 'test-landlord@example.com',
    password: process.env.TEST_LANDLORD_PASSWORD || 'TestPassword123!',
  },
}

export class AuthHelper {
  constructor(private page: Page) {}

  async signIn(email: string, password: string) {
    await this.page.goto('/login')
    await this.page.getByPlaceholder(/email/i).fill(email)
    await this.page.getByPlaceholder(/password/i).fill(password)
    await this.page.getByRole('button', { name: /sign in/i }).click()
    await this.page.waitForURL(/\/(dashboard|discover|profile|quiz)/, { timeout: 15000 })
  }

  async signOut() {
    // Click the profile avatar/button in the navbar to open dropdown
    const profileButton = this.page.locator('nav').getByRole('button').last()
    await profileButton.click()
    await this.page.getByText(/sign out/i).click()
    await this.page.waitForURL('/', { timeout: 10000 })
  }

  async isAuthenticated(): Promise<boolean> {
    // Check if we can access a protected page without redirect
    const response = await this.page.goto('/dashboard')
    const url = this.page.url()
    return !url.includes('/login') && !url.includes('/signin')
  }
}

export class NavigationHelper {
  constructor(private page: Page) {}

  async goToViaSidebar(label: string) {
    await this.page.locator('aside, [role="navigation"]').getByText(label, { exact: false }).click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  async goToViaNavbar(label: string) {
    await this.page.locator('nav').getByText(label, { exact: false }).first().click()
    await this.page.waitForLoadState('domcontentloaded')
  }
}

interface TestFixtures {
  auth: AuthHelper
  nav: NavigationHelper
}

export const test = base.extend<TestFixtures>({
  auth: async ({ page }, use) => {
    await use(new AuthHelper(page))
  },
  nav: async ({ page }, use) => {
    await use(new NavigationHelper(page))
  },
})

export { expect }
