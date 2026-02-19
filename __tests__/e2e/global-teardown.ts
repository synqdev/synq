import type { FullConfig } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { E2E_EMAIL_PREFIX, E2E_EMAIL_DOMAIN } from './helpers'

const prisma = new PrismaClient()

/**
 * Cleans up E2E test data created via UI registration helper.
 *
 * E2E customers use emails like: e2e-<timestamp>@test.example.com
 * We remove dependent rows first, then customer rows.
 */
export default async function globalTeardown(_config: FullConfig) {
  const emailPattern = `${E2E_EMAIL_PREFIX}%${E2E_EMAIL_DOMAIN}`

  try {
    const customers = await prisma.customer.findMany({
      where: {
        email: {
          startsWith: E2E_EMAIL_PREFIX,
          endsWith: E2E_EMAIL_DOMAIN,
        },
      },
      select: { id: true },
    })

    if (customers.length === 0) {
      console.log('[e2e teardown] no e2e customers found')
      return
    }

    const customerIds = customers.map((c) => c.id)

    await prisma.$transaction([
      prisma.booking.deleteMany({ where: { customerId: { in: customerIds } } }),
      prisma.customer.deleteMany({ where: { id: { in: customerIds } } }),
    ])

    console.log(`[e2e teardown] removed ${customerIds.length} customers matching ${emailPattern}`)
  } catch (error) {
    console.error('[e2e teardown] failed to clean up e2e data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}
