import type { FullConfig } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Cleans up E2E test data created via UI registration helper.
 *
 * E2E customers use emails like: e2e-<timestamp>@test.example.com
 * We remove dependent rows first, then customer rows.
 */
export default async function globalTeardown(_config: FullConfig) {
  const emailPattern = 'e2e-%@test.example.com'

  try {
    const customers = await prisma.customer.findMany({
      where: {
        email: {
          startsWith: 'e2e-',
          endsWith: '@test.example.com',
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
      prisma.medicalRecord.deleteMany({ where: { customerId: { in: customerIds } } }),
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
