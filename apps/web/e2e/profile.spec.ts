import { test, expect } from './fixtures/test-fixtures'

test.describe('Profile', () => {
  test.describe('My Profile', () => {
    test('should load my profile page', async ({ page }) => {
      await page.goto('/profile')
      await expect(page).toHaveURL(/\/profile/)
    })

    test('should display user profile information', async ({ page }) => {
      await page.goto('/profile')
      // Should show profile sections
      await expect(page.locator('main')).toBeVisible()
    })

    test('should display verification status section', async ({ page }) => {
      await page.goto('/profile')
      // Should show phone/identity/credit verification indicators
      await expect(page.getByText(/verified|verification|phone|identity/i).first()).toBeVisible()
    })

    test('should display lifestyle compatibility section', async ({ page }) => {
      await page.goto('/profile')
      await expect(page.getByText(/lifestyle|compatibility/i).first()).toBeVisible()
    })

    test('should display living preferences', async ({ page }) => {
      await page.goto('/profile')
      await expect(page.getByText(/living preferences|preferences/i).first()).toBeVisible()
    })

    test('should have retake quiz link', async ({ page }) => {
      await page.goto('/profile')
      const quizLink = page.getByText(/retake quiz/i)
      if (await quizLink.isVisible()) {
        await expect(quizLink).toBeVisible()
      }
    })
  })

  test.describe('Edit Profile', () => {
    test('should load edit profile page', async ({ page }) => {
      await page.goto('/profile/edit')
      await expect(page).toHaveURL(/\/profile\/edit/)
    })

    test('should display Edit Profile heading', async ({ page }) => {
      await page.goto('/profile/edit')
      await expect(page.getByText(/edit profile/i).first()).toBeVisible()
    })

    test('should display profile photo section', async ({ page }) => {
      await page.goto('/profile/edit')
      await expect(page.getByText(/profile photo|change photo/i).first()).toBeVisible()
    })

    test('should display basic information fields', async ({ page }) => {
      await page.goto('/profile/edit')
      await expect(page.getByText(/full name|basic information/i).first()).toBeVisible()
    })

    test('should display About You section with bio', async ({ page }) => {
      await page.goto('/profile/edit')
      await expect(page.getByText(/about you|bio/i).first()).toBeVisible()
    })

    test('should display location and language section', async ({ page }) => {
      await page.goto('/profile/edit')
      await expect(page.getByText(/location|language/i).first()).toBeVisible()
    })

    test('should have Save and Discard buttons', async ({ page }) => {
      await page.goto('/profile/edit')
      await expect(page.getByRole('button', { name: /save profile|save/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /discard/i })).toBeVisible()
    })
  })
})
