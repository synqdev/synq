import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getAdminSession } from '@/lib/auth/admin'
import { prisma } from '@/lib/db/client'
import { AdminDashboardClient } from './admin-dashboard-client'
import { mapAdminBookingsToCalendar } from '@/lib/mappers/calendar'
import { toZonedTime } from '@/lib/utils/time'
import type { AdminBooking } from '@/lib/mappers/calendar'

interface AdminDashboardPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ date?: string }>
}

interface WorkerRow {
  id: string
  name: string
  nameEn: string | null
}

interface BookingRow {
  id: string
  workerId: string
  startsAt: Date
  endsAt: Date
  status: string
  serviceId: string
  customer: {
    name: string
    email: string
  }
  service: {
    name: string
    nameEn: string | null
  }
  worker: {
    name: string
  }
}

/**
 * Admin Dashboard Page
 *
 * Protected admin page showing calendar with all bookings using EmployeeTimeline.
 * Fetches workers and bookings for the selected date.
 */
export default async function AdminDashboardPage({
  params,
  searchParams,
}: AdminDashboardPageProps) {
  const { locale } = await params
  const { date: dateParam } = await searchParams
  const t = await getTranslations('admin.dashboardPage')

  // Verify admin session (full JWT verification)
  const isAuthenticated = await getAdminSession()
  if (!isAuthenticated) {
    redirect(`/${locale}/admin/login`)
  }

  // Parse date from query or use today (in JST)
  const dateStr = dateParam || new Date().toISOString().split('T')[0]
  const date = new Date(dateStr + 'T00:00:00')

  // Calculate start and end of day in JST (same as availability API)
  const startOfDay = toZonedTime(dateStr, '00:00')
  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)

  // Fetch workers and bookings in parallel
  const [workers, bookings] = await Promise.all([
    prisma.worker.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.booking.findMany({
      where: {
        startsAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        customer: {
          select: { name: true, email: true },
        },
        service: {
          select: { name: true, nameEn: true },
        },
        worker: {
          select: { name: true },
        },
      },
      orderBy: { startsAt: 'asc' },
    }),
  ])

  // Transform to mapper format
  const adminBookings: AdminBooking[] = bookings.map((booking: BookingRow) => ({
    id: booking.id,
    workerId: booking.workerId,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    customerName: booking.customer.name,
    status: booking.status,
    serviceId: booking.serviceId,
  }))

  // Use mapper to transform for EmployeeTimeline
  const timelineWorkers = mapAdminBookingsToCalendar(
    workers.map((w: WorkerRow) => ({ id: w.id, name: w.name, nameEn: w.nameEn ?? undefined })),
    adminBookings
  )

  return (
    <div data-testid="admin-dashboard-page">
      <h2 className="text-2xl font-bold mb-6" data-testid="admin-dashboard-heading">
        {t('title')}
      </h2>
      <AdminDashboardClient
        initialWorkers={timelineWorkers}
        date={date}
      />
    </div>
  )
}
