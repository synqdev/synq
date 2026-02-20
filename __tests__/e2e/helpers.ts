import { randomUUID } from 'crypto'
import type { Page } from '@playwright/test'

export const E2E_EMAIL_PREFIX = 'e2e-'
export const E2E_EMAIL_DOMAIN = '@test.example.com'

// Seed data constants matching prisma/seed.ts
export const SEED = {
  workers: {
    tanaka: { id: 'worker-tanaka', name: '田中', nameEn: 'Tanaka' },
    suzuki: { id: 'worker-suzuki', name: '鈴木', nameEn: 'Suzuki' },
    yamamoto: { id: 'worker-yamamoto', name: '山本', nameEn: 'Yamamoto' },
  },
  services: {
    shiatsu: {
      id: 'service-shiatsu',
      name: 'スタンダード指圧',
      nameEn: 'Standard Shiatsu',
      duration: 60,
      price: 6000,
    },
    premiumOil: {
      id: 'service-premium-oil',
      name: 'プレミアムオイル',
      nameEn: 'Premium Oil',
      duration: 90,
      price: 10000,
    },
  },
  resources: {
    bed1: { id: 'resource-bed-1', name: 'ベッド1' },
    bed2: { id: 'resource-bed-2', name: 'ベッド2' },
    bed3: { id: 'resource-bed-3', name: 'ベッド3' },
  },
} as const

/** Returns the next weekday (Mon-Sat) as YYYY-MM-DD. Workers have no Sunday schedule. */
export function getNextWeekday(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  while (date.getDay() === 0) {
    date.setDate(date.getDate() + 1)
  }
  return date.toISOString().split('T')[0]
}

/** Returns the next Sunday as YYYY-MM-DD. */
export function getNextSunday(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  while (date.getDay() !== 0) {
    date.setDate(date.getDate() + 1)
  }
  return date.toISOString().split('T')[0]
}

/**
 * Registers a test customer via the UI form.
 * Sets the customerId cookie required for the booking preview page.
 */
export async function registerTestCustomer(page: Page, locale = 'en') {
  await page.goto(`/${locale}/register`)
  await page.getByTestId('register-form').waitFor({ state: 'visible' })

  await page.fill('input[name="name"]', 'E2E Test User')
  await page.fill('input[name="email"]', `${E2E_EMAIL_PREFIX}${randomUUID()}${E2E_EMAIL_DOMAIN}`)
  await page.fill('input[name="phone"]', '090-0000-0000')
  // Submit form — server action creates customer, sets cookie, then redirects
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/booking/, { timeout: 30000 })
}
