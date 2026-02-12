import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth/admin'
import { prisma } from '@/lib/db/client'
import { AdminCalendar } from './admin-calendar'
import type { CalendarSlot } from '@/types/calendar'

interface AdminDashboardPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ date?: string }>
}

/**
 * Admin Dashboard Page
 *
 * Protected admin page showing calendar with all bookings.
 * Fetches workers and bookings for the selected date.
 */
export default async function AdminDashboardPage({
  params,
  searchParams,
}: AdminDashboardPageProps) {
  const { locale } = await params
  const { date: dateParam } = await searchParams

  // Verify admin session (full JWT verification)
  const isAuthenticated = await getAdminSession()
  if (!isAuthenticated) {
    redirect(`/${locale}/admin/login`)
  }

  // Parse date from query or use today
  const date = dateParam ? new Date(dateParam + 'T00:00:00') : new Date()
  date.setHours(0, 0, 0, 0)

  // Calculate start and end of day
  const startOfDay = new Date(date)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

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

  // Transform bookings to calendar slots
  const slots: CalendarSlot[] = bookings.map((booking) => ({
    time: booking.startsAt.toISOString().split('T')[1].slice(0, 5),
    workerId: booking.workerId,
    resourceId: booking.resourceId,
    isAvailable: false,
    booking: {
      id: booking.id,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      workerId: booking.workerId,
      resourceId: booking.resourceId,
      customerName: booking.customer.name,
      serviceName:
        locale === 'ja'
          ? booking.service.name
          : booking.service.nameEn || booking.service.name,
      status: booking.status as 'CONFIRMED' | 'CANCELLED' | 'NOSHOW',
    },
  }))

  // Transform workers for calendar (with proper null handling)
  const calendarWorkers = workers.map((w) => ({
    id: w.id,
    name: w.name,
    nameEn: w.nameEn,
  }))

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">
        {locale === 'ja' ? 'ダッシュボード' : 'Dashboard'}
      </h2>
      <AdminCalendar
        workers={calendarWorkers}
        slots={slots}
        date={date}
        locale={locale}
      />
    </div>
  )
}
