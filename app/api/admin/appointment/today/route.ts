/**
 * Admin Today's Appointments API
 *
 * Returns today's bookings ordered by time with karute status,
 * used by the dashboard "Today" tab and sidebar prev/next navigation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth/admin'
import { toZonedTime } from '@/lib/utils/time'
import { formatInTimeZone } from '@/lib/utils/time'

/**
 * GET /api/admin/appointment/today
 *
 * Fetches all bookings for a given day with karute status.
 *
 * Query params:
 * - date: Date in YYYY-MM-DD format (defaults to today in JST)
 *
 * @returns { bookings: [...] } with each booking including a computed hasKarute boolean
 */
export async function GET(request: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse date from query params, default to today in JST
  const { searchParams } = request.nextUrl
  const dateStr =
    searchParams.get('date') || formatInTimeZone(new Date()).date

  // Calculate day boundaries in JST
  const startOfDay = toZonedTime(dateStr, '00:00')
  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)

  const bookings = await prisma.booking.findMany({
    where: {
      startsAt: { gte: startOfDay, lt: endOfDay },
      status: { not: 'CANCELLED' },
    },
    include: {
      customer: {
        select: { name: true },
      },
      service: {
        select: { name: true, nameEn: true },
      },
      worker: {
        select: { name: true },
      },
      karuteRecords: {
        select: { id: true, status: true },
        take: 1,
      },
    },
    orderBy: { startsAt: 'asc' },
  })

  // Transform bookings to include hasKarute boolean
  const transformedBookings = bookings.map((b) => ({
    id: b.id,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    status: b.status,
    customerName: b.customer.name,
    serviceName: b.service.name,
    serviceNameEn: b.service.nameEn,
    workerName: b.worker.name,
    hasKarute: b.karuteRecords.length > 0,
    karuteStatus: b.karuteRecords[0]?.status ?? null,
  }))

  return NextResponse.json({ bookings: transformedBookings })
}
