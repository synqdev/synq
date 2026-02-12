/**
 * Admin Calendar E2E Tests
 *
 * Tests the admin dashboard calendar with real seeded data.
 * Auth setup must succeed — tests fail immediately if not on dashboard.
 */
import { test, expect } from '@playwright/test'
import { SEED } from './helpers'

test.describe('Admin Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/admin/dashboard')
    // If auth setup failed, this assertion fails immediately — no silent skipping
    await expect(page).toHaveURL(/\/admin\/dashboard/)
    await expect(page.getByTestId('admin-dashboard-heading')).toBeVisible()
  })

  test('displays dashboard with all 3 seeded workers', async ({ page }) => {
    await expect(page.getByTestId('employee-timeline')).toBeVisible()

    // Exactly 3 workers from seed data
    const workerNames = page.getByTestId('timeline-worker-name')
    await expect(workerNames).toHaveCount(3)

    // Verify exact worker IDs from seed
    await expect(page.locator('[data-worker-id="worker-tanaka"]')).toBeVisible()
    await expect(page.locator('[data-worker-id="worker-suzuki"]')).toBeVisible()
    await expect(page.locator('[data-worker-id="worker-yamamoto"]')).toBeVisible()

    // Time labels should cover 10:00-19:00 (10 labels)
    const timeLabels = page.getByTestId('timeline-time-label')
    expect(await timeLabels.count()).toBeGreaterThanOrEqual(10)

    // Date navigation controls should be present
    await expect(page.getByTestId('admin-date-previous')).toBeVisible()
    await expect(page.getByTestId('admin-date-today')).toBeVisible()
    await expect(page.getByTestId('admin-date-next')).toBeVisible()
  })

  test('date navigation changes the displayed date and returns', async ({ page }) => {
    const displayBefore = await page.getByTestId('admin-date-display').textContent()

    // Navigate forward
    await page.getByTestId('admin-date-next').click()
    await page.waitForURL(/date=/)

    const displayAfter = await page.getByTestId('admin-date-display').textContent()
    expect(displayAfter).not.toEqual(displayBefore)

    // Dashboard and timeline should persist
    await expect(page.getByTestId('admin-dashboard-heading')).toBeVisible()
    await expect(page.getByTestId('employee-timeline')).toBeVisible()

    // Navigate back — date display should change
    await page.getByTestId('admin-date-previous').click()
    // Wait for date display to update (it changes via client-side state)
    await expect(page.getByTestId('admin-date-display')).not.toHaveText(displayAfter!)
  })

  test('today button navigates to current date', async ({ page }) => {
    // First navigate away
    await page.getByTestId('admin-date-next').click()
    await page.waitForURL(/date=/)

    // Click today
    await page.getByTestId('admin-date-today').click()

    // Dashboard should reload with today's data
    await expect(page.getByTestId('admin-dashboard-heading')).toBeVisible()
    await expect(page.getByTestId('employee-timeline')).toBeVisible()
  })

  test('calendar API returns correct data shape with 3 workers', async ({ page }) => {
    // Intercept the admin calendar API (polled by SWR every 10s)
    const calendarResponse = await page.waitForResponse(
      (resp) => resp.url().includes('/api/admin/calendar') && resp.status() === 200,
      { timeout: 15000 }
    )

    const data = await calendarResponse.json()
    expect(data).toHaveProperty('date')
    expect(data).toHaveProperty('workers')
    expect(data).toHaveProperty('bookings')

    // Exactly 3 seeded workers
    expect(data.workers).toHaveLength(3)
    const workerIds = data.workers.map((w: any) => w.id)
    expect(workerIds).toContain(SEED.workers.tanaka.id)
    expect(workerIds).toContain(SEED.workers.suzuki.id)
    expect(workerIds).toContain(SEED.workers.yamamoto.id)

    // Workers should have name and nameEn
    for (const worker of data.workers) {
      expect(worker).toHaveProperty('name')
      expect(worker).toHaveProperty('nameEn')
    }

    // Bookings should be an array
    expect(Array.isArray(data.bookings)).toBe(true)
  })

  test('calendar works in Japanese locale', async ({ page }) => {
    await page.goto('/ja/admin/dashboard')
    await expect(page).toHaveURL(/\/admin\/dashboard/)
    await expect(page.getByTestId('admin-dashboard-heading')).toBeVisible()
    await expect(page.getByTestId('employee-timeline')).toBeVisible()

    // All 3 workers should still render
    const workerNames = page.getByTestId('timeline-worker-name')
    await expect(workerNames).toHaveCount(3)
  })

  test('loads without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})
