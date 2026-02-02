import { test, expect, testUsers } from './fixtures/test-fixtures'

test.describe('Lifestyle Quiz Flow', () => {
  test.beforeEach(async ({ auth }) => {
    // Sign in before each test
    await auth.signIn(testUsers.seeker.email, testUsers.seeker.password)
  })

  test.describe('Quiz Navigation', () => {
    test('should display quiz introduction', async ({ page }) => {
      await page.goto('/quiz')

      await expect(page.locator('h1')).toContainText(/quiz|lifestyle|preferences/i)
      await expect(page.locator('button:has-text("Start"), button:has-text("Begin")')).toBeVisible()
    })

    test('should show progress indicator', async ({ page }) => {
      await page.goto('/quiz')
      await page.click('button:has-text("Start"), button:has-text("Begin")')

      await expect(page.locator('[data-testid="progress"], [role="progressbar"]')).toBeVisible()
    })

    test('should allow going back to previous question', async ({ page }) => {
      await page.goto('/quiz')
      await page.click('button:has-text("Start"), button:has-text("Begin")')

      // Answer first question
      await page.click('[data-testid="option"]:first-child')
      await page.click('button:has-text("Next")')

      // Go back
      await page.click('button:has-text("Back"), button:has-text("Previous")')

      // Should be on first question
      await expect(page.locator('[data-testid="question-1"], [data-question="1"]')).toBeVisible()
    })
  })

  test.describe('Quiz Questions', () => {
    test('should require selecting an option before proceeding', async ({ page }) => {
      await page.goto('/quiz')
      await page.click('button:has-text("Start"), button:has-text("Begin")')

      // Try to click next without selecting
      const nextButton = page.locator('button:has-text("Next")')
      await expect(nextButton).toBeDisabled()
    })

    test('should enable next button after selection', async ({ page }) => {
      await page.goto('/quiz')
      await page.click('button:has-text("Start"), button:has-text("Begin")')

      // Select an option
      await page.click('[data-testid="option"]:first-child')

      // Next should be enabled
      const nextButton = page.locator('button:has-text("Next")')
      await expect(nextButton).toBeEnabled()
    })

    test('should highlight selected option', async ({ page }) => {
      await page.goto('/quiz')
      await page.click('button:has-text("Start"), button:has-text("Begin")')

      const option = page.locator('[data-testid="option"]:first-child')
      await option.click()

      // Should have selected styling
      await expect(option).toHaveAttribute('data-selected', 'true')
    })
  })

  test.describe('Quiz Completion', () => {
    test('should show completion screen after all questions', async ({ quiz, page }) => {
      await quiz.completeQuiz()

      // Should show success or completion message
      await expect(page.locator('text=/complete|success|done|submitted/i').first()).toBeVisible()
    })

    test('should calculate compatibility after quiz', async ({ quiz, page }) => {
      await quiz.completeQuiz()

      // Navigate to discover/matches
      await page.goto('/discover')

      // Should show compatibility scores
      await expect(page.locator('[data-testid="compatibility-score"]').first()).toBeVisible()
    })

    test('should allow retaking quiz', async ({ quiz, page }) => {
      await quiz.completeQuiz()

      // Go to settings or profile
      await page.goto('/settings')

      // Should have option to retake quiz
      await expect(page.locator('button:has-text("Retake"), a:has-text("Quiz")')).toBeVisible()
    })
  })

  test.describe('Quiz Persistence', () => {
    test('should save progress on page reload', async ({ page }) => {
      await page.goto('/quiz')
      await page.click('button:has-text("Start"), button:has-text("Begin")')

      // Answer first two questions
      await page.click('[data-testid="option"]:first-child')
      await page.click('button:has-text("Next")')
      await page.click('[data-testid="option"]:nth-child(2)')
      await page.click('button:has-text("Next")')

      // Reload page
      await page.reload()

      // Should be on third question or resume prompt
      await expect(
        page.locator('[data-question="3"], text=/resume|continue/i').first()
      ).toBeVisible()
    })
  })
})
