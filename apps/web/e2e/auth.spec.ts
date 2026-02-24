import { test, expect, testUsers } from './fixtures/test-fixtures'

test.describe('Authentication Flow', () => {
  test.describe('Sign Up', () => {
    test('should display signup form', async ({ page }) => {
      await page.goto('/signup')

      await expect(page.locator('input[name="name"]')).toBeVisible()
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/signup')
      await page.click('button[type="submit"]')

      await expect(page.locator('text=required').first()).toBeVisible()
    })

    test('should show error for invalid email', async ({ page }) => {
      await page.goto('/signup')
      await page.fill('input[name="name"]', 'Test User')
      await page.fill('input[name="email"]', 'invalid-email')
      await page.fill('input[name="password"]', 'ValidPass123!')
      await page.click('button[type="submit"]')

      await expect(page.locator('text=/invalid|email/i').first()).toBeVisible()
    })

    test('should show error for weak password', async ({ page }) => {
      await page.goto('/signup')
      await page.fill('input[name="name"]', 'Test User')
      await page.fill('input[name="email"]', 'test@example.com')
      await page.fill('input[name="password"]', '123')
      await page.click('button[type="submit"]')

      await expect(page.locator('text=/password|characters/i').first()).toBeVisible()
    })

    test('should successfully sign up new user', async ({ auth }) => {
      const email = `test-${Date.now()}@example.com`
      await auth.signUp(email, 'SecurePass123!', 'New Test User')

      // Should redirect to onboarding or dashboard
      await expect(auth['page']).toHaveURL(/\/(dashboard|onboarding|quiz)/)
    })

    test('should show error for existing email', async ({ page }) => {
      await page.goto('/signup')
      await page.fill('input[name="name"]', 'Existing User')
      await page.fill('input[name="email"]', testUsers.seeker.email)
      await page.fill('input[name="password"]', 'SecurePass123!')
      await page.click('button[type="submit"]')

      await expect(page.locator('text=/already|exists|registered/i').first()).toBeVisible()
    })
  })

  test.describe('Sign In', () => {
    test('should display signin form', async ({ page }) => {
      await page.goto('/signin')

      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('input[name="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/signin')
      await page.fill('input[name="email"]', 'wrong@example.com')
      await page.fill('input[name="password"]', 'WrongPassword123!')
      await page.click('button[type="submit"]')

      await expect(page.locator('text=/invalid|incorrect|wrong/i').first()).toBeVisible()
    })

    test('should successfully sign in existing user', async ({ auth }) => {
      await auth.signIn(testUsers.seeker.email, testUsers.seeker.password)

      // Should be signed in
      await expect(await auth.isSignedIn()).toBe(true)
    })

    test('should redirect to protected page after signin', async ({ page }) => {
      // Try to access protected page
      await page.goto('/dashboard')

      // Should redirect to signin
      await expect(page).toHaveURL(/\/signin/)

      // Sign in
      await page.fill('input[name="email"]', testUsers.seeker.email)
      await page.fill('input[name="password"]', testUsers.seeker.password)
      await page.click('button[type="submit"]')

      // Should redirect back to dashboard
      await expect(page).toHaveURL(/\/dashboard/)
    })
  })

  test.describe('Sign Out', () => {
    test('should sign out successfully', async ({ auth, page }) => {
      await auth.signIn(testUsers.seeker.email, testUsers.seeker.password)
      await auth.signOut()

      // Should be on home page
      await expect(page).toHaveURL('/')

      // Should not be signed in
      await expect(await auth.isSignedIn()).toBe(false)
    })
  })

  test.describe('Password Reset', () => {
    test('should display forgot password link', async ({ page }) => {
      await page.goto('/signin')

      await expect(page.locator('a:has-text("Forgot")').first()).toBeVisible()
    })

    test('should navigate to password reset page', async ({ page }) => {
      await page.goto('/signin')
      await page.click('a:has-text("Forgot")')

      await expect(page).toHaveURL(/\/forgot-password|\/reset/)
    })
  })
})
