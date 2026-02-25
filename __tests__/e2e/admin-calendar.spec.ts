/**
 * Admin Calendar E2E Tests
 *
 * Tests the admin dashboard with the prototype calendar (TimetableWithTabs).
 * Auth setup must succeed — tests fail immediately if not on dashboard.
 */
import { test, expect } from '@playwright/test'
import { SEED } from './helpers'

test.describe('Admin Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/admin/dashboard')
    await expect(page).toHaveURL(/\/admin\/dashboard/)
    // Layout renders the SYNQ heading
    await expect(page.locator('h1')).toContainText('SYNQ')
  })

  test('displays dashboard with all 3 seeded workers', async ({ page }) => {
    // Workers render as avatar cards with their names in the timetable
    for (const worker of Object.values(SEED.workers)) {
      await expect(page.getByText(worker.name)).toBeVisible()
    }
  })

  test('tab navigation works between calendar and management views', async ({ page }) => {
    // Click Workers tab
    await page.getByText('Workers').click()
    await page.waitForURL(/tab=workers/)

    // Click Services tab
    await page.getByText('Services').click()
    await page.waitForURL(/tab=services/)

    // Click back to Calendar
    await page.getByText('Calendar').click()
    await page.waitForURL(/tab=calendar|\/admin\/dashboard/)
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
    await expect(page.locator('h1')).toContainText('SYNQ')

    // All 3 workers should render with Japanese names
    for (const worker of Object.values(SEED.workers)) {
      await expect(page.getByText(worker.name)).toBeVisible()
    }
  })

  test('loads without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})
