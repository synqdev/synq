/**
 * Admin Calendar API
 *
 * Returns detailed calendar data for admin dashboard including
 * all bookings with customer information.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth/admin'
import { toZonedTime } from '@/lib/utils/time'

/**
 * GET /api/admin/calendar
 *
 * Fetches all bookings for a given date with worker and customer details.
 *
 * Query params:
 * - date: Date in YYYY-MM-DD format (defaults to today)
 *
 * @returns Workers with their bookings for the requested date
 */
export async function GET(request: NextRequest) {
  // Verify admin authentication
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse date from query params
  const { searchParams } = request.nextUrl
  const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]

  // Calculate day boundaries in JST (same as availability API)
  const startOfDay = toZonedTime(dateStr, '00:00')
  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)

  console.log('startOfDay (JST)', startOfDay.toISOString())
  console.log('endOfDay (JST)', endOfDay.toISOString())
  // Fetch workers and bookings in parallel
  const [workers, bookings] = await Promise.all([
    prisma.worker.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        nameEn: true,
      },
    }),
    prisma.booking.findMany({
      where: {
        startsAt: { gte: startOfDay, lt: endOfDay },
        status: { not: 'CANCELLED' }, // Only show active bookings
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        workerId: true,
        resourceId: true,
        customer: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        service: {
          select: {
            name: true,
            nameEn: true,
          },
        },
        worker: {
          select: {
            id: true,
            name: true,
            nameEn: true,
          },
        },
        resource: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startsAt: 'asc' },
    }),
  ])

  // Transform bookings to API response format
  const transformedBookings = bookings.map((b) => ({
    id: b.id,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    workerId: b.workerId,
    resourceId: b.resourceId,
    customerName: b.customer.name,
    customerEmail: b.customer.email,
    customerPhone: b.customer.phone,
    serviceName: b.service.name,
    serviceNameEn: b.service.nameEn,
    workerName: b.worker.name,
    workerNameEn: b.worker.nameEn,
    resourceName: b.resource.name,
    status: b.status,
  }))

  return NextResponse.json({
    date: dateStr,
    workers: workers.map((w) => ({
      id: w.id,
      name: w.name,
      nameEn: w.nameEn,
    })),
    bookings: transformedBookings,
  })
}
