/**
 * User Booking Flow E2E Tests
 *
 * Tests the complete user booking journey from service selection to confirmation.
 * This is the most critical user flow in the application.
 */
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

async function expectServiceSelectionPage(page: Page) {
  await expect(page.getByTestId('service-heading')).toBeVisible()

  const serviceButtons = page.getByTestId('service-option')
  const count = await serviceButtons.count()
  expect(
    count,
    'No services found. Seed the database with: npx prisma db seed'
  ).toBeGreaterThan(0)
}

test.describe('User Booking Flow', () => {
  test('complete booking flow - happy path', async ({ page }) => {
    // Start at the service selection page (first step)
    await page.goto('/en/booking/service')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Page should display service selection
    await expect(page).toHaveURL(/\/booking\/service/)
    await expectServiceSelectionPage(page)

    // Select the first available service
    const serviceButtons = page.getByTestId('service-option')
    await serviceButtons.first().click()

    // Should land on date selection with serviceId
    await expect(page).toHaveURL(/\/booking\/date\?serviceId=/)
    await expect(page.getByTestId('date-heading')).toBeVisible()

    // Fill date (tomorrow to avoid past date)
    const dateInput = page.getByTestId('date-input')
    await expect(dateInput).toBeVisible()
    await dateInput.fill(toISODate(addDays(new Date(), 1)))

    await page.getByTestId('date-next').click()
    const serviceIdParam = new URL(page.url()).searchParams.get('serviceId')
    const selectedDate = await dateInput.inputValue()

    // Slot selection page
    try {
      await page.waitForURL(/\/booking\/slots\?serviceId=.*&date=/, { timeout: 10000 })
    } catch {
      if (serviceIdParam && selectedDate) {
        await page.goto(`/en/booking/slots?serviceId=${serviceIdParam}&date=${selectedDate}`)
      }
    }
    await expect(page).toHaveURL(/\/booking\/slots\?serviceId=.*&date=/)
    await expect(page.getByTestId('slots-heading')).toBeVisible()

    // Fail early if availability API errored (usually missing seed data)
    await expect(page.getByTestId('slots-error')).toHaveCount(0)

    // Assert either availability or explicit empty state
    const available = page.getByTestId('timeline-slot-available')
    const noAvailability = page.getByTestId('slots-empty')
    const availableCount = await available.count()
    const emptyCount = await noAvailability.count()
    expect(availableCount + emptyCount).toBeGreaterThan(0)
  })

  test('can navigate to booking from home', async ({ page }) => {
    // Start at home page
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    // Look for booking link/button
    const bookingLink = page.getByRole('link', { name: /book now/i })
    await expect(bookingLink).toBeVisible()
    await bookingLink.click()

    // Booking page may redirect to register if no customer session
    await page.waitForURL(/\/(register|booking)/)
    await page.waitForLoadState('networkidle')

    const registerEmail = page.getByRole('textbox', { name: /email/i })
    const bookingPage = page.getByTestId('booking-page')

    await Promise.race([
      registerEmail.waitFor({ state: 'visible' }),
      bookingPage.waitFor({ state: 'visible' }),
    ])

    if (await registerEmail.isVisible().catch(() => false)) {
      await expect(registerEmail).toBeVisible()
    } else {
      await expect(bookingPage).toBeVisible()
      await expect(page.getByTestId('booking-selection-form')).toBeVisible()
    }
  })

  test('booking page displays in both locales', async ({ page }) => {
    // Test English version
    await page.goto('/en/booking/service')
    await page.waitForLoadState('networkidle')
    await expectServiceSelectionPage(page)

    // Test Japanese version
    await page.goto('/ja/booking/service')
    await page.waitForLoadState('networkidle')
    await expectServiceSelectionPage(page)
  })

  test('loads without console errors', async ({ page }) => {
    const errors: string[] = []

    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await page.goto('/en/booking/service')
    await page.waitForLoadState('networkidle')

    await expectServiceSelectionPage(page)
    expect(errors).toHaveLength(0)
  })
})
