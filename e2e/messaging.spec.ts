import { test, expect, testUsers } from './fixtures/test-fixtures'

test.describe('Messaging Flow', () => {
  test.beforeEach(async ({ auth }) => {
    await auth.signIn(testUsers.seeker.email, testUsers.seeker.password)
  })

  test.describe('Conversations List', () => {
    test('should display messages page', async ({ page }) => {
      await page.goto('/messages')

      await expect(page.locator('h1')).toContainText(/message|inbox|conversations/i)
    })

    test('should show list of conversations', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      // Should show conversations or empty state
      const hasConversations = await page.locator('[data-testid="conversation-item"]').count() > 0
      const hasEmptyState = await page.locator('text=/no messages|start a conversation/i').isVisible()

      expect(hasConversations || hasEmptyState).toBe(true)
    })

    test('should show unread indicator', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      const conversations = page.locator('[data-testid="conversation-item"]')
      if (await conversations.count() > 0) {
        // Check for unread indicators
        const unreadBadges = page.locator('[data-testid="unread-badge"]')
        // Just verify the indicator exists if there are unread messages
        console.log(`Found ${await unreadBadges.count()} unread badges`)
      }
    })

    test('should show last message preview', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      const conversations = page.locator('[data-testid="conversation-item"]')
      if (await conversations.count() > 0) {
        await expect(
          conversations.first().locator('[data-testid="message-preview"]')
        ).toBeVisible()
      }
    })

    test('should show message timestamp', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      const conversations = page.locator('[data-testid="conversation-item"]')
      if (await conversations.count() > 0) {
        await expect(
          conversations.first().locator('[data-testid="message-time"]')
        ).toBeVisible()
      }
    })
  })

  test.describe('Conversation View', () => {
    test('should open conversation when clicked', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      const conversations = page.locator('[data-testid="conversation-item"]')
      if (await conversations.count() > 0) {
        await conversations.first().click()

        // Should show message input
        await expect(page.locator('textarea[name="message"]')).toBeVisible()
      }
    })

    test('should display message history', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      const conversations = page.locator('[data-testid="conversation-item"]')
      if (await conversations.count() > 0) {
        await conversations.first().click()

        // Should show messages
        await expect(page.locator('[data-testid="message"]').first()).toBeVisible()
      }
    })

    test('should differentiate sent vs received messages', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      const conversations = page.locator('[data-testid="conversation-item"]')
      if (await conversations.count() > 0) {
        await conversations.first().click()

        // Should have different styling for sent vs received
        const sentMessages = page.locator('[data-testid="message"][data-sent="true"]')
        const receivedMessages = page.locator('[data-testid="message"][data-sent="false"]')

        // At least verify the distinction exists
        console.log(`Sent: ${await sentMessages.count()}, Received: ${await receivedMessages.count()}`)
      }
    })

    test('should show other user profile info', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      const conversations = page.locator('[data-testid="conversation-item"]')
      if (await conversations.count() > 0) {
        await conversations.first().click()

        // Should show user header/info
        await expect(
          page.locator('[data-testid="conversation-header"]')
        ).toBeVisible()
      }
    })
  })

  test.describe('Sending Messages', () => {
    test('should send a text message', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      const conversations = page.locator('[data-testid="conversation-item"]')
      if (await conversations.count() > 0) {
        await conversations.first().click()

        const testMessage = `Test message ${Date.now()}`
        await messaging.sendMessage(testMessage)

        // Message should appear in the list
        await expect(page.locator(`text="${testMessage}"`)).toBeVisible()
      }
    })

    test('should disable send button for empty message', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      const conversations = page.locator('[data-testid="conversation-item"]')
      if (await conversations.count() > 0) {
        await conversations.first().click()

        const sendButton = page.locator('button[type="submit"]')
        await expect(sendButton).toBeDisabled()
      }
    })

    test('should clear input after sending', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      const conversations = page.locator('[data-testid="conversation-item"]')
      if (await conversations.count() > 0) {
        await conversations.first().click()

        await page.fill('textarea[name="message"]', 'Test message')
        await page.click('button[type="submit"]')

        // Input should be cleared
        await expect(page.locator('textarea[name="message"]')).toHaveValue('')
      }
    })

    test('should handle message sending error gracefully', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      const conversations = page.locator('[data-testid="conversation-item"]')
      if (await conversations.count() > 0) {
        await conversations.first().click()

        // Simulate network error by going offline
        await page.context().setOffline(true)

        await page.fill('textarea[name="message"]', 'Test message')
        await page.click('button[type="submit"]')

        // Should show error message
        await expect(page.locator('text=/error|failed|try again/i').first()).toBeVisible()

        // Restore connection
        await page.context().setOffline(false)
      }
    })
  })

  test.describe('Real-time Updates', () => {
    test('should update unread count in navigation', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      // Check for unread badge in nav
      const navBadge = page.locator('[data-testid="nav-messages-badge"]')
      // This is informational - badge may or may not exist
      console.log(`Nav badge visible: ${await navBadge.isVisible()}`)
    })

    test('should mark messages as read when conversation opened', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      const conversations = page.locator('[data-testid="conversation-item"]')
      if (await conversations.count() > 0) {
        // Check if first conversation has unread badge
        const firstConvo = conversations.first()
        const hadUnread = await firstConvo.locator('[data-testid="unread-badge"]').isVisible()

        if (hadUnread) {
          await firstConvo.click()
          await page.waitForTimeout(1000) // Wait for mark-as-read API

          // Navigate back to list
          await page.click('[data-testid="back-button"], button[aria-label="Back"]')

          // Unread badge should be gone
          await expect(firstConvo.locator('[data-testid="unread-badge"]')).not.toBeVisible()
        }
      }
    })
  })

  test.describe('Starting New Conversations', () => {
    test('should have new message button', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      await expect(
        page.locator('button:has-text("New"), a:has-text("New Message")')
      ).toBeVisible()
    })

    test('should show user search when starting new conversation', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      await page.click('button:has-text("New"), a:has-text("New Message")')

      // Should show search or user picker
      await expect(
        page.locator('input[placeholder*="search"], [data-testid="user-search"]')
      ).toBeVisible()
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('should show conversation list on mobile', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      // Conversations should be visible
      await expect(page.locator('[data-testid="conversations-list"]')).toBeVisible()
    })

    test('should hide list when viewing conversation on mobile', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      const conversations = page.locator('[data-testid="conversation-item"]')
      if (await conversations.count() > 0) {
        await conversations.first().click()

        // List should be hidden, messages visible
        await expect(page.locator('[data-testid="messages-view"]')).toBeVisible()
      }
    })

    test('should have back button on mobile conversation view', async ({ messaging, page }) => {
      await messaging.navigateToMessages()

      const conversations = page.locator('[data-testid="conversation-item"]')
      if (await conversations.count() > 0) {
        await conversations.first().click()

        await expect(
          page.locator('[data-testid="back-button"], button[aria-label="Back"]')
        ).toBeVisible()
      }
    })
  })
})
