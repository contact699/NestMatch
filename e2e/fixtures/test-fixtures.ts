import { test as base, expect, Page } from '@playwright/test'

/**
 * Test user credentials for E2E testing
 * These should be set up in a test database or using test accounts
 */
export const testUsers = {
  seeker: {
    email: process.env.TEST_SEEKER_EMAIL || 'test-seeker@example.com',
    password: process.env.TEST_SEEKER_PASSWORD || 'TestPassword123!',
  },
  landlord: {
    email: process.env.TEST_LANDLORD_EMAIL || 'test-landlord@example.com',
    password: process.env.TEST_LANDLORD_PASSWORD || 'TestPassword123!',
  },
  newUser: {
    email: `test-${Date.now()}@example.com`,
    password: 'NewUserPass123!',
  },
}

/**
 * Authentication helper functions
 */
export class AuthHelper {
  constructor(private page: Page) {}

  async signUp(email: string, password: string, name: string = 'Test User') {
    await this.page.goto('/signup')
    await this.page.fill('input[name="name"]', name)
    await this.page.fill('input[name="email"]', email)
    await this.page.fill('input[name="password"]', password)
    await this.page.click('button[type="submit"]')
    // Wait for redirect or success message
    await this.page.waitForURL(/\/(dashboard|onboarding|quiz)/, { timeout: 10000 })
  }

  async signIn(email: string, password: string) {
    await this.page.goto('/signin')
    await this.page.fill('input[name="email"]', email)
    await this.page.fill('input[name="password"]', password)
    await this.page.click('button[type="submit"]')
    // Wait for redirect to dashboard or app
    await this.page.waitForURL(/\/(dashboard|discover|profile)/, { timeout: 10000 })
  }

  async signOut() {
    // Click user menu and sign out
    await this.page.click('[data-testid="user-menu"]')
    await this.page.click('[data-testid="sign-out"]')
    await this.page.waitForURL('/')
  }

  async isSignedIn(): Promise<boolean> {
    // Check for authenticated elements
    return this.page.locator('[data-testid="user-menu"]').isVisible()
  }
}

/**
 * Quiz helper functions
 */
export class QuizHelper {
  constructor(private page: Page) {}

  async completeQuiz() {
    await this.page.goto('/quiz')

    // Answer lifestyle questions
    await this.selectOption('sleep-schedule', 'night-owl')
    await this.clickNext()

    await this.selectOption('noise-level', 'moderate')
    await this.clickNext()

    await this.selectOption('cleanliness', 'tidy')
    await this.clickNext()

    await this.selectOption('guests', 'occasional')
    await this.clickNext()

    await this.selectOption('smoking', 'no')
    await this.clickNext()

    await this.selectOption('pets', 'love-them')
    await this.clickNext()

    // Submit quiz
    await this.page.click('button[type="submit"]')
    await this.page.waitForURL(/\/(dashboard|discover|profile)/, { timeout: 10000 })
  }

  private async selectOption(questionId: string, optionValue: string) {
    await this.page.click(`[data-question="${questionId}"] [data-value="${optionValue}"]`)
  }

  private async clickNext() {
    await this.page.click('button:has-text("Next")')
    await this.page.waitForTimeout(300) // Wait for animation
  }
}

/**
 * Messaging helper functions
 */
export class MessagingHelper {
  constructor(private page: Page) {}

  async navigateToMessages() {
    await this.page.goto('/messages')
    await this.page.waitForLoadState('networkidle')
  }

  async openConversation(userName: string) {
    await this.page.click(`[data-testid="conversation-${userName}"]`)
    await this.page.waitForLoadState('networkidle')
  }

  async sendMessage(text: string) {
    await this.page.fill('textarea[name="message"]', text)
    await this.page.click('button[type="submit"]')
    // Wait for message to appear
    await expect(this.page.locator(`text="${text}"`)).toBeVisible()
  }

  async getLastMessage(): Promise<string> {
    const messages = this.page.locator('[data-testid="message"]')
    return (await messages.last().textContent()) || ''
  }
}

/**
 * Discovery/Matching helper functions
 */
export class DiscoverHelper {
  constructor(private page: Page) {}

  async navigateToDiscover() {
    await this.page.goto('/discover')
    await this.page.waitForLoadState('networkidle')
  }

  async viewSuggestions() {
    await this.page.click('[data-tab="suggestions"]')
    await this.page.waitForLoadState('networkidle')
  }

  async viewCompatiblePeople() {
    await this.page.click('[data-tab="compatible"]')
    await this.page.waitForLoadState('networkidle')
  }

  async viewPublicGroups() {
    await this.page.click('[data-tab="groups"]')
    await this.page.waitForLoadState('networkidle')
  }

  async expressInterest(suggestionIndex: number = 0) {
    const cards = this.page.locator('[data-testid="suggestion-card"]')
    await cards.nth(suggestionIndex).locator('button:has-text("Interested")').click()
  }

  async dismissSuggestion(suggestionIndex: number = 0) {
    const cards = this.page.locator('[data-testid="suggestion-card"]')
    await cards.nth(suggestionIndex).locator('button:has-text("Dismiss")').click()
  }
}

/**
 * Extended test fixture with all helpers
 */
interface TestFixtures {
  auth: AuthHelper
  quiz: QuizHelper
  messaging: MessagingHelper
  discover: DiscoverHelper
}

export const test = base.extend<TestFixtures>({
  auth: async ({ page }, use) => {
    await use(new AuthHelper(page))
  },
  quiz: async ({ page }, use) => {
    await use(new QuizHelper(page))
  },
  messaging: async ({ page }, use) => {
    await use(new MessagingHelper(page))
  },
  discover: async ({ page }, use) => {
    await use(new DiscoverHelper(page))
  },
})

export { expect }
