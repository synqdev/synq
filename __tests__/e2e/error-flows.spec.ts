/**
 * Error Flow E2E Tests
 *
 * Tests edge cases, redirects, API validation, and error states.
 * Ensures the app handles bad input and missing state gracefully.
 */
import { test, expect } from '@playwright/test'
import { SEED, getNextWeekday, getNextSunday, registerTestCustomer } from './helpers'

test.describe('Error Flows', () => {
  test('service page does not show empty state when services exist', async ({ page }) => {
    await page.goto('/en/booking/service')
    await expect(page.getByTestId('service-heading')).toBeVisible()

    // Empty state should NOT be shown (2 active services in seed)
    await expect(page.getByTestId('service-empty')).toHaveCount(0)
    await expect(page.getByTestId('service-option')).toHaveCount(2)
  })

  test('slots page shows error for invalid service ID', async ({ page }) => {
    const testDate = getNextWeekday()
    await page.goto(`/en/booking/slots?serviceId=nonexistent-service&date=${testDate}`)

    // Should show error state (service not found in API)
    await expect(page.getByTestId('slots-error')).toBeVisible()
  })

  test('Sunday shows no available slots (workers not scheduled)', async ({ page }) => {
    const sunday = getNextSunday()
    await page.goto(
      `/en/booking/slots?serviceId=${SEED.services.shiatsu.id}&date=${sunday}`
    )

    // Should not show API error
    await expect(page.getByTestId('slots-error')).toHaveCount(0)

    // Workers have no Sunday schedule, so no available slots should exist
    const available = page.getByTestId('timeline-slot-available')
    expect(await available.count()).toBe(0)
  })

  test('date page redirects to service page when serviceId is missing', async ({ page }) => {
    await page.goto('/en/booking/date')
    await expect(page).toHaveURL(/\/booking\/service/)
  })

  test('slots page redirects to service page when params are missing', async ({ page }) => {
    await page.goto('/en/booking/slots')
    await expect(page).toHaveURL(/\/booking\/service/)
  })

  test('preview page redirects to register when no customer cookie', async ({ page, context }) => {
    // Clear all cookies to remove customerId
    await context.clearCookies()

    const testDate = getNextWeekday()
    await page.goto(
      `/en/booking/preview?serviceId=${SEED.services.shiatsu.id}&date=${testDate}&workerId=${SEED.workers.tanaka.id}&time=10:00&resourceId=${SEED.resources.bed1.id}`
    )

    // Should redirect to register (no customerId cookie)
    await expect(page).toHaveURL(/\/register/)
    await expect(page.getByTestId('register-page')).toBeVisible()
  })

  test('preview page redirects to service when params are missing', async ({ page }) => {
    await registerTestCustomer(page, 'en')
    await page.goto('/en/booking/preview')
    await expect(page).toHaveURL(/\/booking\/service/)
  })

  test('confirm page shows not-found for invalid booking ID', async ({ page }) => {
    await page.goto('/en/booking/confirm?id=nonexistent-booking-id')
    await expect(page.getByTestId('confirm-not-found')).toBeVisible()
  })

  test('confirm page shows not-found when no ID provided', async ({ page }) => {
    await page.goto('/en/booking/confirm')
    await expect(page.getByTestId('confirm-not-found')).toBeVisible()
  })

  test('admin dashboard redirects to login without auth', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/en/admin/dashboard')
    await expect(page).toHaveURL(/\/admin\/login/)
    await expect(page.getByTestId('admin-login-heading')).toBeVisible()
  })

  test('admin login shows error with wrong credentials', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/en/admin/login')

    await page.fill('input[name="username"]', 'wronguser')
    await page.fill('input[name="password"]', 'wrongpass')
    await page.click('button[type="submit"]')

    // Wait for server action to complete — error appears after pending state resolves
    await expect(page.getByTestId('admin-login-error')).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('booking API rejects invalid payload', async ({ page }) => {
    const response = await page.request.post('/api/bookings', {
      data: { serviceId: '' },
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })

  test('availability API rejects missing serviceId', async ({ page }) => {
    const testDate = getNextWeekday()
    const response = await page.request.get(
      `/api/availability?date=${testDate}`
    )
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('serviceId')
  })
})
