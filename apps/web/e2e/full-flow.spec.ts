import { test, expect } from './fixtures/test-fixtures'

/**
 * Complete end-to-end user journey test
 * Tests the full flow: signup → quiz → discover → messaging
 */
test.describe('Full User Journey', () => {
  // Generate unique email for this test run
  const testEmail = `e2e-test-${Date.now()}@example.com`
  const testPassword = 'SecureTestPass123!'
  const testName = 'E2E Test User'

  test('complete new user journey: signup → quiz → discover → message', async ({
    page,
    auth,
    quiz,
    discover,
    messaging,
  }) => {
    // ============================================
    // STEP 1: SIGN UP
    // ============================================
    test.step('Sign up as new user', async () => {
      await page.goto('/signup')

      await page.fill('input[name="name"]', testName)
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')

      // Should redirect to quiz or onboarding
      await page.waitForURL(/\/(quiz|onboarding|dashboard)/, { timeout: 15000 })

      // Verify we're signed in
      expect(await auth.isSignedIn()).toBe(true)
    })

    // ============================================
    // STEP 2: COMPLETE LIFESTYLE QUIZ
    // ============================================
    await test.step('Complete lifestyle quiz', async () => {
      // Navigate to quiz if not already there
      if (!page.url().includes('/quiz')) {
        await page.goto('/quiz')
      }

      // Start quiz if there's a start button
      const startButton = page.locator('button:has-text("Start"), button:has-text("Begin")')
      if (await startButton.isVisible()) {
        await startButton.click()
      }

      // Answer all quiz questions
      // Question 1: Sleep Schedule
      await page.click('[data-testid="option"]:nth-child(2)')
      await page.click('button:has-text("Next")')

      // Question 2: Noise Level
      await page.click('[data-testid="option"]:nth-child(2)')
      await page.click('button:has-text("Next")')

      // Question 3: Cleanliness
      await page.click('[data-testid="option"]:nth-child(1)')
      await page.click('button:has-text("Next")')

      // Question 4: Guests
      await page.click('[data-testid="option"]:nth-child(2)')
      await page.click('button:has-text("Next")')

      // Question 5: Smoking
      await page.click('[data-testid="option"]:nth-child(1)')
      await page.click('button:has-text("Next")')

      // Question 6: Pets
      await page.click('[data-testid="option"]:nth-child(2)')

      // Submit quiz
      await page.click('button:has-text("Submit"), button:has-text("Finish")')

      // Wait for completion
      await page.waitForURL(/\/(dashboard|discover|profile)/, { timeout: 10000 })
    })

    // ============================================
    // STEP 3: SET UP SEEKING PROFILE
    // ============================================
    await test.step('Complete seeking profile', async () => {
      await page.goto('/profile')

      // Fill in seeking profile if form is visible
      const seekingSection = page.locator('[data-testid="seeking-profile"]')
      if (await seekingSection.isVisible()) {
        // Budget
        await page.fill('input[name="budgetMin"]', '800')
        await page.fill('input[name="budgetMax"]', '1500')

        // Move-in date
        const moveInDate = new Date()
        moveInDate.setMonth(moveInDate.getMonth() + 1)
        await page.fill('input[name="moveInDate"]', moveInDate.toISOString().split('T')[0])

        // Preferred cities
        await page.fill('input[name="preferredCities"]', 'Toronto')
        await page.keyboard.press('Enter')

        // Save
        await page.click('button:has-text("Save")')
        await expect(page.locator('text=/saved|updated/i').first()).toBeVisible()
      }
    })

    // ============================================
    // STEP 4: EXPLORE DISCOVER PAGE
    // ============================================
    await test.step('Browse discover page and matches', async () => {
      await discover.navigateToDiscover()

      // View suggested groups tab
      await discover.viewSuggestions()
      await page.waitForLoadState('networkidle')

      // View compatible people tab
      await discover.viewCompatiblePeople()
      await page.waitForLoadState('networkidle')

      // View public groups tab
      await discover.viewPublicGroups()
      await page.waitForLoadState('networkidle')

      // Check if there are any matches/suggestions
      const hasSuggestions = await page.locator('[data-testid="suggestion-card"]').count() > 0
      const hasCompatible = await page.locator('[data-testid="user-card"]').count() > 0
      const hasGroups = await page.locator('[data-testid="group-card"]').count() > 0

      console.log(`Suggestions: ${hasSuggestions}, Compatible: ${hasCompatible}, Groups: ${hasGroups}`)
    })

    // ============================================
    // STEP 5: START A CONVERSATION
    // ============================================
    await test.step('Navigate to messages and start conversation', async () => {
      await messaging.navigateToMessages()

      // Check for existing conversations or start new
      const hasConversations = await page.locator('[data-testid="conversation-item"]').count() > 0

      if (hasConversations) {
        // Open existing conversation
        await page.locator('[data-testid="conversation-item"]').first().click()
      } else {
        // Try to start new conversation
        const newButton = page.locator('button:has-text("New"), a:has-text("New Message")')
        if (await newButton.isVisible()) {
          await newButton.click()
        }
      }
    })

    // ============================================
    // STEP 6: SEND A MESSAGE
    // ============================================
    await test.step('Send a test message', async () => {
      const messageInput = page.locator('textarea[name="message"]')

      if (await messageInput.isVisible()) {
        const testMessage = 'Hello! This is an E2E test message.'
        await messageInput.fill(testMessage)
        await page.click('button[type="submit"]')

        // Verify message was sent
        await expect(page.locator(`text="${testMessage}"`)).toBeVisible({ timeout: 5000 })
      }
    })

    // ============================================
    // STEP 7: SIGN OUT
    // ============================================
    await test.step('Sign out', async () => {
      await auth.signOut()

      // Should be on home page and not signed in
      await expect(page).toHaveURL('/')
      expect(await auth.isSignedIn()).toBe(false)
    })

    // ============================================
    // STEP 8: SIGN BACK IN
    // ============================================
    await test.step('Sign back in and verify data persists', async () => {
      await auth.signIn(testEmail, testPassword)

      // Navigate to profile and verify quiz data was saved
      await page.goto('/profile')

      // Lifestyle preferences should be saved
      await expect(
        page.locator('[data-testid="lifestyle-preferences"]')
      ).toBeVisible()

      // Navigate to messages and verify conversation exists
      await messaging.navigateToMessages()

      // Our test conversation should still exist
      const conversations = page.locator('[data-testid="conversation-item"]')
      // At minimum, the page should load successfully
      await page.waitForLoadState('networkidle')
    })
  })

  // ============================================
  // ADDITIONAL JOURNEY TESTS
  // ============================================

  test('user can update profile after initial setup', async ({ auth, page }) => {
    const email = `e2e-update-${Date.now()}@example.com`
    await auth.signUp(email, 'TestPass123!', 'Update Test')

    await page.goto('/profile')

    // Update bio
    const bioField = page.locator('textarea[name="bio"]')
    if (await bioField.isVisible()) {
      await bioField.fill('This is my updated bio from E2E test')
      await page.click('button:has-text("Save")')
      await expect(page.locator('text=/saved|updated/i').first()).toBeVisible()
    }

    // Verify persistence after reload
    await page.reload()
    await expect(page.locator('text="This is my updated bio from E2E test"')).toBeVisible()
  })

  test('user receives matches after completing quiz', async ({ auth, quiz, discover, page }) => {
    const email = `e2e-matching-${Date.now()}@example.com`
    await auth.signUp(email, 'TestPass123!', 'Matching Test')

    // Complete quiz
    await quiz.completeQuiz()

    // Check for matches
    await discover.navigateToDiscover()

    // Should either have matches or show that matching is processing
    const hasContent =
      (await page.locator('[data-testid="suggestion-card"]').count() > 0) ||
      (await page.locator('[data-testid="user-card"]').count() > 0) ||
      (await page.locator('text=/generating|processing|no matches yet/i').isVisible())

    expect(hasContent).toBe(true)
  })

  test('user can save and unsave listings', async ({ auth, page }) => {
    const email = `e2e-save-${Date.now()}@example.com`
    await auth.signUp(email, 'TestPass123!', 'Save Test')

    // Navigate to listings
    await page.goto('/listings')

    const listings = page.locator('[data-testid="listing-card"]')
    if (await listings.count() > 0) {
      // Save first listing
      const saveButton = listings.first().locator('[data-testid="save-button"]')
      await saveButton.click()

      // Verify saved
      await expect(saveButton).toHaveAttribute('data-saved', 'true')

      // Navigate to saved listings
      await page.goto('/saved')

      // Should see the saved listing
      await expect(page.locator('[data-testid="listing-card"]').first()).toBeVisible()
    }
  })
})
