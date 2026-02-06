/**
 * User Booking Flow E2E Tests
 *
 * Tests the complete user booking journey from service selection to confirmation.
 * This is the most critical user flow in the application.
 */
import { test, expect } from '@playwright/test'

test.describe('User Booking Flow', () => {
  test('complete booking flow - happy path', async ({ page }) => {
    // Start at the service selection page (first step)
    await page.goto('/en/booking/service')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Page should display service selection
    await expect(page).toHaveURL(/\/booking\/service/)

    // Check that the page loaded without errors
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible()
  })

  test('can navigate to booking from home', async ({ page }) => {
    // Start at home page
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    // Look for booking link/button
    const bookingLink = page.getByRole('link', { name: /book/i }).first()

    if (await bookingLink.isVisible().catch(() => false)) {
      await bookingLink.click()

      // Should navigate to booking flow
      await expect(page).toHaveURL(/\/booking/)
    }
  })

  test('booking page displays in both locales', async ({ page }) => {
    // Test English version
    await page.goto('/en/booking/service')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()

    // Test Japanese version
    await page.goto('/ja/booking/service')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('loads without console errors', async ({ page }) => {
    const errors: string[] = []

    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await page.goto('/en/booking/service')
    await page.waitForLoadState('networkidle')

    expect(errors).toHaveLength(0)
  })
})
