/**
 * Authentication Setup for E2E Tests
 *
 * This runs before all tests to authenticate as admin and save the session state.
 * Other tests will reuse this authenticated state.
 */
import { test as setup, expect } from '@playwright/test'

const authFile = '.playwright/auth.json'

setup('authenticate as admin', async ({ page }) => {
  // Navigate to admin login page
  await page.goto('/en/admin/login')

  // Fill in login form with credentials from .env
  await page.fill('input[name="username"]', process.env.ADMIN_USERNAME || 'admin')
  await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD || '123')

  // Submit the form
  await page.click('button[type="submit"]')

  // Wait for navigation to dashboard
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 })

  // Verify we're on the dashboard
  await expect(page).toHaveURL(/\/admin\/dashboard/)

  // Save signed-in state
  await page.context().storageState({ path: authFile })
})
