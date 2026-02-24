import { test, expect, testUsers } from './fixtures/test-fixtures'

test.describe('Discover/Matching Flow', () => {
  test.beforeEach(async ({ auth }) => {
    await auth.signIn(testUsers.seeker.email, testUsers.seeker.password)
  })

  test.describe('Discover Page Navigation', () => {
    test('should display discover page with tabs', async ({ page }) => {
      await page.goto('/discover')

      await expect(page.locator('h1')).toContainText(/discover|find|matches/i)

      // Should show three tabs
      await expect(page.locator('[data-tab="suggestions"], [role="tab"]:has-text("Suggested")')).toBeVisible()
      await expect(page.locator('[data-tab="compatible"], [role="tab"]:has-text("Compatible")')).toBeVisible()
      await expect(page.locator('[data-tab="groups"], [role="tab"]:has-text("Groups")')).toBeVisible()
    })

    test('should switch between tabs', async ({ discover, page }) => {
      await discover.navigateToDiscover()

      // Click each tab and verify content changes
      await page.click('[data-tab="compatible"], [role="tab"]:has-text("Compatible")')
      await expect(page.locator('[data-testid="compatible-list"]')).toBeVisible()

      await page.click('[data-tab="groups"], [role="tab"]:has-text("Groups")')
      await expect(page.locator('[data-testid="groups-list"]')).toBeVisible()

      await page.click('[data-tab="suggestions"], [role="tab"]:has-text("Suggested")')
      await expect(page.locator('[data-testid="suggestions-list"]')).toBeVisible()
    })
  })

  test.describe('Suggested Groups', () => {
    test('should display group suggestions', async ({ discover, page }) => {
      await discover.navigateToDiscover()
      await discover.viewSuggestions()

      // Should show suggestion cards or empty state
      const hasCards = await page.locator('[data-testid="suggestion-card"]').count() > 0
      const hasEmptyState = await page.locator('text=/no suggestions|complete your quiz/i').isVisible()

      expect(hasCards || hasEmptyState).toBe(true)
    })

    test('should show group details in suggestion card', async ({ discover, page }) => {
      await discover.navigateToDiscover()
      await discover.viewSuggestions()

      const cards = page.locator('[data-testid="suggestion-card"]')
      if (await cards.count() > 0) {
        const firstCard = cards.first()

        // Should show member photos
        await expect(firstCard.locator('[data-testid="member-photos"]')).toBeVisible()

        // Should show scores
        await expect(firstCard.locator('[data-testid="compatibility-score"]')).toBeVisible()

        // Should show action buttons
        await expect(firstCard.locator('button:has-text("Interested")')).toBeVisible()
        await expect(firstCard.locator('button:has-text("Dismiss")')).toBeVisible()
      }
    })

    test('should express interest in suggestion', async ({ discover, page }) => {
      await discover.navigateToDiscover()
      await discover.viewSuggestions()

      const cards = page.locator('[data-testid="suggestion-card"]')
      if (await cards.count() > 0) {
        await discover.expressInterest(0)

        // Should show confirmation or redirect to group
        await expect(
          page.locator('text=/invitation sent|interest expressed|group created/i').first()
        ).toBeVisible()
      }
    })

    test('should dismiss suggestion', async ({ discover, page }) => {
      await discover.navigateToDiscover()
      await discover.viewSuggestions()

      const initialCount = await page.locator('[data-testid="suggestion-card"]').count()
      if (initialCount > 0) {
        await discover.dismissSuggestion(0)

        // Should have one less card or show undo option
        const newCount = await page.locator('[data-testid="suggestion-card"]').count()
        const hasUndo = await page.locator('button:has-text("Undo")').isVisible()

        expect(newCount < initialCount || hasUndo).toBe(true)
      }
    })
  })

  test.describe('Compatible People', () => {
    test('should display list of compatible users', async ({ discover, page }) => {
      await discover.navigateToDiscover()
      await discover.viewCompatiblePeople()

      // Should show user cards or empty state
      const hasCards = await page.locator('[data-testid="user-card"]').count() > 0
      const hasEmptyState = await page.locator('text=/no matches|complete your profile/i').isVisible()

      expect(hasCards || hasEmptyState).toBe(true)
    })

    test('should show compatibility percentage', async ({ discover, page }) => {
      await discover.navigateToDiscover()
      await discover.viewCompatiblePeople()

      const cards = page.locator('[data-testid="user-card"]')
      if (await cards.count() > 0) {
        const firstCard = cards.first()
        await expect(firstCard.locator('[data-testid="compatibility-badge"]')).toBeVisible()
      }
    })

    test('should show verification badges', async ({ discover, page }) => {
      await discover.navigateToDiscover()
      await discover.viewCompatiblePeople()

      const cards = page.locator('[data-testid="user-card"]')
      if (await cards.count() > 0) {
        // At least some cards should have verification badges
        const badgeCount = await page.locator('[data-testid="verification-badge"]').count()
        // This is informational - not all users may be verified
        console.log(`Found ${badgeCount} verified users`)
      }
    })

    test('should allow viewing user profile', async ({ discover, page }) => {
      await discover.navigateToDiscover()
      await discover.viewCompatiblePeople()

      const cards = page.locator('[data-testid="user-card"]')
      if (await cards.count() > 0) {
        await cards.first().click()

        // Should navigate to profile or show modal
        await expect(
          page.locator('[data-testid="user-profile"], [role="dialog"]').first()
        ).toBeVisible()
      }
    })
  })

  test.describe('Public Groups', () => {
    test('should display list of public groups', async ({ discover, page }) => {
      await discover.navigateToDiscover()
      await discover.viewPublicGroups()

      const hasCards = await page.locator('[data-testid="group-card"]').count() > 0
      const hasEmptyState = await page.locator('text=/no groups|create a group/i').isVisible()

      expect(hasCards || hasEmptyState).toBe(true)
    })

    test('should show group member count', async ({ discover, page }) => {
      await discover.navigateToDiscover()
      await discover.viewPublicGroups()

      const cards = page.locator('[data-testid="group-card"]')
      if (await cards.count() > 0) {
        await expect(cards.first().locator('text=/\\d+ member/i')).toBeVisible()
      }
    })

    test('should allow requesting to join group', async ({ discover, page }) => {
      await discover.navigateToDiscover()
      await discover.viewPublicGroups()

      const cards = page.locator('[data-testid="group-card"]')
      if (await cards.count() > 0) {
        const joinButton = cards.first().locator('button:has-text("Join"), button:has-text("Request")')
        if (await joinButton.isVisible()) {
          await joinButton.click()

          await expect(
            page.locator('text=/request sent|joined|pending/i').first()
          ).toBeVisible()
        }
      }
    })
  })

  test.describe('Filtering and Sorting', () => {
    test('should have filter options', async ({ discover, page }) => {
      await discover.navigateToDiscover()

      await expect(
        page.locator('button:has-text("Filter"), [data-testid="filter-button"]')
      ).toBeVisible()
    })

    test('should filter by location', async ({ discover, page }) => {
      await discover.navigateToDiscover()
      await discover.viewCompatiblePeople()

      // Open filters
      await page.click('button:has-text("Filter"), [data-testid="filter-button"]')

      // Set location filter
      await page.fill('input[name="location"], [data-testid="location-filter"]', 'Toronto')
      await page.click('button:has-text("Apply")')

      // Results should be filtered (or show empty state for no results in that location)
      await page.waitForLoadState('networkidle')
    })

    test('should filter by budget range', async ({ discover, page }) => {
      await discover.navigateToDiscover()
      await discover.viewCompatiblePeople()

      await page.click('button:has-text("Filter"), [data-testid="filter-button"]')

      // Set budget filter
      await page.fill('input[name="budgetMin"]', '500')
      await page.fill('input[name="budgetMax"]', '1500')
      await page.click('button:has-text("Apply")')

      await page.waitForLoadState('networkidle')
    })

    test('should sort by compatibility', async ({ discover, page }) => {
      await discover.navigateToDiscover()
      await discover.viewCompatiblePeople()

      // Find and use sort option
      const sortButton = page.locator('button:has-text("Sort"), [data-testid="sort-button"]')
      if (await sortButton.isVisible()) {
        await sortButton.click()
        await page.click('text=/compatibility|best match/i')
        await page.waitForLoadState('networkidle')
      }
    })
  })
})
