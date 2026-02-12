/**
 * User Booking Flow E2E Tests
 *
 * Tests the complete booking journey from service selection through confirmation.
 * Asserts on real seeded data, intercepts API responses, and completes the full flow.
 */
import { test, expect } from '@playwright/test'
import { SEED, getNextWeekday, registerTestCustomer } from './helpers'

test.describe('User Booking Flow', () => {
  test('complete booking flow: service -> date -> slot -> preview -> confirm', async ({ page }) => {
    // This test covers the entire multi-step flow — give it extra time
    test.setTimeout(60000)

    // Register customer first — sets customerId cookie required for preview page
    await registerTestCustomer(page, 'en')

    // ── Step 1: Service Selection ──
    await page.goto('/en/booking/service')
    await expect(page.getByTestId('service-heading')).toBeVisible()

    // Assert exactly 2 active seeded services (block-service is inactive)
    const serviceOptions = page.getByTestId('service-option')
    await expect(serviceOptions).toHaveCount(2)

    // Verify seeded service data is rendered
    const firstService = serviceOptions.first()
    await expect(firstService).toContainText('Standard Shiatsu')
    await expect(firstService).toContainText('60')
    await expect(firstService).toContainText('6,000')

    const secondService = serviceOptions.nth(1)
    await expect(secondService).toContainText('Premium Oil')
    await expect(secondService).toContainText('90')
    await expect(secondService).toContainText('10,000')

    // No empty state should be shown
    await expect(page.getByTestId('service-empty')).toHaveCount(0)

    // Click Standard Shiatsu
    await firstService.click()

    // ── Step 2: Date Selection ──
    await expect(page).toHaveURL(/\/booking\/date\?serviceId=/)
    await expect(page.getByTestId('date-heading')).toBeVisible()

    // Verify service context is shown on date page
    await expect(page.locator('text=Standard Shiatsu')).toBeVisible()

    // Pick next weekday (workers only scheduled Mon-Sat)
    const testDate = getNextWeekday()
    await page.getByTestId('date-input').fill(testDate)

    // Submit date form — server action redirects to /booking/slots
    await page.getByTestId('date-next').click()
    await page.waitForURL(/\/booking\/slots\?serviceId=.*&date=/, { timeout: 15000 })

    // ── Step 3: Slot Selection ──
    await expect(page.getByTestId('slots-heading')).toBeVisible()

    // Verify service + date context is shown
    await expect(page.getByTestId('slots-service')).toBeVisible()

    // Verify NO error or empty state is shown
    await expect(page.getByTestId('slots-error')).toHaveCount(0)
    await expect(page.getByTestId('slots-empty')).toHaveCount(0)

    // Verify all 3 workers rendered in timeline
    await expect(page.locator('[data-worker-id="worker-tanaka"]')).toBeVisible()
    await expect(page.locator('[data-worker-id="worker-suzuki"]')).toBeVisible()
    await expect(page.locator('[data-worker-id="worker-yamamoto"]')).toBeVisible()

    // Click the first available slot
    const availableSlots = page.getByTestId('timeline-slot-available')
    expect(await availableSlots.count()).toBeGreaterThan(0)
    await availableSlots.first().click()

    // Click Next to go to preview (scoped to slots page to avoid Next.js dev tools button)
    const nextButton = page.getByTestId('slots-page').getByRole('button', { name: /next/i })
    await expect(nextButton).toBeEnabled()
    await nextButton.click()

    // ── Step 4: Preview Page ──
    // router.push + server-side rendering can be slow in dev mode
    await page.waitForURL(/\/booking\/preview\?/, { timeout: 15000 })
    await expect(page.getByTestId('booking-preview')).toBeVisible()
    await expect(page.getByTestId('preview-heading')).toBeVisible()

    // Assert booking details from seed data
    await expect(page.getByTestId('preview-service-name')).toContainText('Standard Shiatsu')
    const previewWorker = await page.getByTestId('preview-worker-name').textContent()
    expect(['Tanaka', 'Suzuki', 'Yamamoto']).toContain(previewWorker?.trim())
    await expect(page.getByTestId('preview-duration')).toContainText('60')
    await expect(page.getByTestId('preview-price')).toContainText('6,000')

    // No error should be visible
    await expect(page.getByTestId('preview-error')).toHaveCount(0)

    // Intercept booking creation API (this IS a client-side fetch)
    const bookingPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/bookings') && resp.request().method() === 'POST'
    )

    // Click Confirm
    await page.getByTestId('preview-confirm').click()

    // Verify POST /api/bookings response
    const bookingResp = await bookingPromise
    expect(bookingResp.status()).toBe(201)
    const bookingData = await bookingResp.json()
    expect(bookingData).toHaveProperty('booking')
    expect(bookingData.booking).toHaveProperty('id')
    expect(typeof bookingData.booking.id).toBe('string')

    // ── Step 5: Confirmation Page ──
    await expect(page).toHaveURL(/\/booking\/confirm\?id=/)
    await expect(page.getByTestId('confirm-page')).toBeVisible()
    await expect(page.getByTestId('confirm-heading')).toBeVisible()

    // Assert booking details on confirmation
    await expect(page.getByTestId('confirm-service-name')).toContainText('Standard Shiatsu')
    const confirmWorker = await page.getByTestId('confirm-worker-name').textContent()
    expect(['Tanaka', 'Suzuki', 'Yamamoto']).toContain(confirmWorker?.trim())
    await expect(page.getByTestId('confirm-status')).toBeVisible()
  })

  test('service page shows exactly 2 seeded services with correct data', async ({ page }) => {
    await page.goto('/en/booking/service')
    await expect(page.getByTestId('service-heading')).toBeVisible()

    const options = page.getByTestId('service-option')
    await expect(options).toHaveCount(2)

    // Each service should display price and duration
    for (let i = 0; i < 2; i++) {
      const text = await options.nth(i).textContent()
      expect(text).toMatch(/¥/)
      expect(text).toMatch(/\d+/)
    }
  })

  test('Japanese locale shows Japanese service names', async ({ page }) => {
    await page.goto('/ja/booking/service')
    await expect(page.getByTestId('service-heading')).toBeVisible()

    const options = page.getByTestId('service-option')
    await expect(options).toHaveCount(2)

    // Should show Japanese names from seed data
    await expect(options.first()).toContainText('スタンダード指圧')
    await expect(options.nth(1)).toContainText('プレミアムオイル')
  })

  test('date page shows selected service context', async ({ page }) => {
    await page.goto(`/en/booking/date?serviceId=${SEED.services.shiatsu.id}`)
    await expect(page.getByTestId('date-heading')).toBeVisible()
    await expect(page.locator('text=Standard Shiatsu')).toBeVisible()
    await expect(page.locator('text=60')).toBeVisible()
  })

  test('slots page shows all 3 workers with available slots on weekday', async ({ page }) => {
    const testDate = getNextWeekday()
    await page.goto(
      `/en/booking/slots?serviceId=${SEED.services.shiatsu.id}&date=${testDate}`
    )

    await expect(page.getByTestId('slots-heading')).toBeVisible()
    await expect(page.getByTestId('slots-error')).toHaveCount(0)

    // All 3 seeded workers should be rendered
    await expect(page.locator('[data-worker-id="worker-tanaka"]')).toBeVisible()
    await expect(page.locator('[data-worker-id="worker-suzuki"]')).toBeVisible()
    await expect(page.locator('[data-worker-id="worker-yamamoto"]')).toBeVisible()

    // Should have available slots (workers scheduled 10:00-19:00 Mon-Sat)
    const available = page.getByTestId('timeline-slot-available')
    expect(await available.count()).toBeGreaterThan(0)
  })

  test('premium oil service shows correct details', async ({ page }) => {
    await page.goto('/en/booking/service')

    const premiumOil = page.getByTestId('service-option').filter({ hasText: 'Premium Oil' })
    await expect(premiumOil).toBeVisible()
    await expect(premiumOil).toContainText('90')
    await expect(premiumOil).toContainText('10,000')
  })

  test('loads without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto('/en/booking/service')
    await expect(page.getByTestId('service-heading')).toBeVisible()
    expect(errors).toHaveLength(0)
  })
})
