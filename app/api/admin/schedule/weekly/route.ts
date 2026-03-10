/**
 * Weekly Schedule API
 *
 * Returns all workers' recurring schedules and booking counts for a given week.
 * Used by the WhenIWork-style schedule grid on the admin dashboard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth/admin'
import { toZonedTime } from '@/lib/utils/time'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/schedule/weekly
 *
 * Query params:
 * - startDate: ISO date string (YYYY-MM-DD)
 * - days: number of days to fetch (default 7, max 42)
 *
 * Returns workers with their 7-day schedules and booking counts.
 */
export async function GET(request: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startDateParam = request.nextUrl.searchParams.get('startDate')
  if (!startDateParam) {
    return NextResponse.json({ error: 'startDate is required' }, { status: 400 })
  }

  const daysParam = request.nextUrl.searchParams.get('days')
  const numDays = Math.min(Math.max(parseInt(daysParam ?? '7', 10) || 7, 1), 42)

  // Parse date boundaries
  const weekStart = new Date(startDateParam + 'T00:00:00')
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + numDays)

  const weekStartStr = startDateParam
  const weekEndDate = new Date(weekStart)
  weekEndDate.setDate(weekEndDate.getDate() + numDays - 1)
  const weekEndStr = weekEndDate.toISOString().split('T')[0]

  // Fetch active workers with their recurring schedules
  const workers = await prisma.worker.findMany({
    where: { isActive: true },
    include: {
      schedules: {
        where: { specificDate: null },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Build date range for booking queries
  const weekStartDt = toZonedTime(weekStartStr, '00:00')
  const weekEndDt = toZonedTime(weekEndStr, '23:59')

  // Fetch bookings for the week grouped by worker and day
  const bookings = await prisma.booking.findMany({
    where: {
      startsAt: { gte: weekStartDt },
      endsAt: { lte: weekEndDt },
      status: { not: 'CANCELLED' },
    },
    select: {
      workerId: true,
      startsAt: true,
      endsAt: true,
    },
  })

  // Group bookings by worker and date
  const bookingsByWorkerDate = new Map<string, Map<string, { count: number; totalMinutes: number }>>()
  for (const booking of bookings) {
    const dateStr = booking.startsAt.toISOString().split('T')[0]
    const key = booking.workerId

    if (!bookingsByWorkerDate.has(key)) {
      bookingsByWorkerDate.set(key, new Map())
    }
    const workerMap = bookingsByWorkerDate.get(key)!
    const existing = workerMap.get(dateStr) ?? { count: 0, totalMinutes: 0 }
    const durationMinutes = (booking.endsAt.getTime() - booking.startsAt.getTime()) / (1000 * 60)
    workerMap.set(dateStr, {
      count: existing.count + 1,
      totalMinutes: existing.totalMinutes + durationMinutes,
    })
  }

  // Build response
  const result = workers.map((worker) => {
    // Build 7-day schedule array (dayOfWeek 0=Sunday through 6=Saturday)
    const scheduleMap = new Map<number, { startTime: string; endTime: string; isAvailable: boolean }>()
    for (const sched of worker.schedules) {
      if (sched.dayOfWeek !== null) {
        scheduleMap.set(sched.dayOfWeek, {
          startTime: sched.startTime,
          endTime: sched.endTime,
          isAvailable: sched.isAvailable,
        })
      }
    }

    const schedules = Array.from({ length: 7 }, (_, i) => {
      const existing = scheduleMap.get(i)
      return {
        dayOfWeek: i,
        startTime: existing?.startTime ?? '09:00',
        endTime: existing?.endTime ?? '18:00',
        isAvailable: existing?.isAvailable ?? false,
      }
    })

    // Build week bookings
    const workerBookings = bookingsByWorkerDate.get(worker.id)
    const weekBookings: Array<{ date: string; count: number; hours: number }> = []
    let totalBookings = 0

    for (let d = 0; d < numDays; d++) {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + d)
      const dateStr = date.toISOString().split('T')[0]
      const dayData = workerBookings?.get(dateStr)
      if (dayData) {
        weekBookings.push({
          date: dateStr,
          count: dayData.count,
          hours: Math.round((dayData.totalMinutes / 60) * 10) / 10,
        })
        totalBookings += dayData.count
      }
    }

    // Calculate total scheduled hours
    let totalHoursScheduled = 0
    for (const sched of schedules) {
      if (sched.isAvailable) {
        const [sh, sm] = sched.startTime.split(':').map(Number)
        const [eh, em] = sched.endTime.split(':').map(Number)
        totalHoursScheduled += (eh * 60 + em - sh * 60 - sm) / 60
      }
    }

    return {
      id: worker.id,
      name: worker.name,
      schedules,
      weekBookings,
      totalHoursScheduled: Math.round(totalHoursScheduled * 10) / 10,
      totalBookings,
    }
  })

  return NextResponse.json({
    workers: result,
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
  })
}
