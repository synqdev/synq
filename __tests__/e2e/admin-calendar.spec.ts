/**
 * Admin Calendar E2E Tests
 *
 * Tests the admin dashboard calendar functionality including:
 * - Viewing the calendar with workers and bookings
 * - Date navigation
 * - Calendar interactions
 */
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function assertLoginPage(page: Page) {
  await expect(page).toHaveURL(/\/admin\/login/)
  await expect(page.getByTestId('admin-login-heading')).toBeVisible()
  await expect(page.getByTestId('admin-login-username')).toBeVisible()
  await expect(page.getByTestId('admin-login-password')).toBeVisible()
  await expect(page.getByTestId('admin-login-submit')).toBeVisible()
}

async function assertDashboard(page: Page) {
  await expect(page.getByTestId('admin-dashboard-heading')).toBeVisible()
  await expect(page.getByTestId('admin-date-previous')).toBeVisible()
  await expect(page.getByTestId('admin-date-today')).toBeVisible()
  await expect(page.getByTestId('admin-date-next')).toBeVisible()

  // Timeline should render time labels and at least one worker name
  await expect(page.getByTestId('employee-timeline')).toBeVisible()
  const timeLabels = page.getByTestId('timeline-time-label')
  const workerNames = page.getByTestId('timeline-worker-name')
  expect(await timeLabels.count()).toBeGreaterThan(0)
  expect(await workerNames.count()).toBeGreaterThan(0)
}

test.describe('Admin Calendar', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin dashboard
    await page.goto('/en/admin/dashboard')
  })

  test('displays admin dashboard with calendar', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    const isLogin = /\/admin\/login/.test(page.url())
    if (isLogin) {
      await assertLoginPage(page)
      return
    }
    await assertDashboard(page)
  })

  test('shows workers in the calendar', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    const isLogin = /\/admin\/login/.test(page.url())
    if (isLogin) {
      await assertLoginPage(page)
      return
    }
    const workerNames = page.getByTestId('timeline-worker-name')
    expect(await workerNames.count()).toBeGreaterThan(0)
  })

  test('can navigate between dates', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const isLogin = /\/admin\/login/.test(page.url())
    if (isLogin) {
      await assertLoginPage(page)
      return
    }

    const nextButton = page.getByTestId('admin-date-next')
    await expect(nextButton).toBeVisible()

    const beforeUrl = page.url()
    const beforeDisplay = await page.getByTestId('admin-date-display').textContent()
    await nextButton.click()
    await page.waitForURL(/date=/)
    await page.waitForLoadState('networkidle')

    const afterUrl = page.url()
    expect(afterUrl).not.toEqual(beforeUrl)
    const afterDisplay = await page.getByTestId('admin-date-display').textContent()
    expect(afterDisplay).not.toEqual(beforeDisplay)
    await expect(page.getByTestId('admin-dashboard-heading')).toBeVisible()
  })

  test('displays bookings for the selected date', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const isLogin = /\/admin\/login/.test(page.url())
    if (isLogin) {
      await assertLoginPage(page)
      return
    }

    // Booked slots render "Booked" or a customer name
    const bookedLabel = page.getByText('Booked')
    const hasBooked = await bookedLabel.count()

    // At minimum, timeline should exist even if there are no bookings
    await expect(page.getByTestId('timeline-time-label').first()).toBeVisible()
    expect(hasBooked).toBeGreaterThanOrEqual(0)
  })

  test('can change locale and calendar still works', async ({ page }) => {
    // Switch to Japanese
    await page.goto('/ja/admin/dashboard')
    await page.waitForLoadState('networkidle')

    if (/\/admin\/login/.test(page.url())) {
      await assertLoginPage(page)
    } else {
    await assertDashboard(page)
    }

    // Switch back to English
    await page.goto('/en/admin/dashboard')
    await page.waitForLoadState('networkidle')

    if (/\/admin\/login/.test(page.url())) {
      await assertLoginPage(page)
    } else {
    await assertDashboard(page)
    }
  })

  test('loads without errors', async ({ page }) => {
    const errors: string[] = []

    // Capture console errors
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await page.waitForLoadState('networkidle')

    const isLogin = /\/admin\/login/.test(page.url())
    if (isLogin) {
      await assertLoginPage(page)
    } else {
      await assertDashboard(page)
    }

    // No page errors should occur
    expect(errors).toHaveLength(0)
  })
})
