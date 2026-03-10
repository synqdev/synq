import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { prisma } from '@/lib/db/client'
import { getWorkerMetrics } from '@/lib/services/reporting.service'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const worker = await prisma.worker.findUnique({
      where: { id },
      include: {
        schedules: {
          where: { specificDate: null },
          orderBy: { dayOfWeek: 'asc' },
        },
        _count: {
          select: {
            bookings: { where: { status: 'CONFIRMED' } },
            assignedCustomers: true,
          },
        },
      },
    })

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    // Build 7-day schedule array with defaults for missing days
    const schedules = Array.from({ length: 7 }, (_, i) => {
      const existing = worker.schedules.find((s) => s.dayOfWeek === i)
      if (existing) {
        return {
          dayOfWeek: i,
          startTime: existing.startTime,
          endTime: existing.endTime,
          isAvailable: existing.isAvailable,
        }
      }
      return {
        dayOfWeek: i,
        startTime: '09:00',
        endTime: '18:00',
        isAvailable: false,
      }
    })

    // Get performance metrics for last 30 days
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const allMetrics = await getWorkerMetrics({ startDate: thirtyDaysAgo, endDate: now })
    const workerMetrics = allMetrics.find((m) => m.workerId === id)

    return NextResponse.json({
      id: worker.id,
      name: worker.name,
      nameEn: worker.nameEn,
      isActive: worker.isActive,
      createdAt: worker.createdAt,
      updatedAt: worker.updatedAt,
      totalBookings: worker._count.bookings,
      assignedCustomers: worker._count.assignedCustomers,
      schedules,
      stats: {
        totalRevenue: workerMetrics?.totalRevenue ?? 0,
        bookingCount: workerMetrics?.bookingCount ?? 0,
        averagePerBooking: workerMetrics?.averagePerBooking ?? 0,
      },
    })
  } catch (error) {
    console.error('Failed to fetch worker detail:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
