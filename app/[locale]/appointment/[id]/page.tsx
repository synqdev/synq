import { redirect, notFound } from 'next/navigation'
import { getAdminSession } from '@/lib/auth/admin'
import { prisma } from '@/lib/db/client'
import { formatInTimeZone } from '@/lib/utils/time'
import { AppointmentWorkstation } from './appointment-workstation'

interface AppointmentPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function AppointmentPage({ params }: AppointmentPageProps) {
  const { locale, id } = await params

  // Auth check - full JWT verification
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    redirect(`/${locale}/admin/login`)
  }

  // Fetch booking with all related data
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          locale: true,
          notes: true,
          visitCount: true,
          lastVisitDate: true,
        },
      },
      worker: {
        select: { id: true, name: true, nameEn: true },
      },
      service: {
        select: { id: true, name: true, nameEn: true, duration: true },
      },
      karuteRecords: {
        select: { id: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
      recordingSessions: {
        select: { id: true, status: true, startedAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!booking) {
    notFound()
  }

  // Get today's booking IDs for prev/next navigation
  // Use the booking's date to determine "today" (in business timezone)
  const { date: bookingDateStr } = formatInTimeZone(booking.startsAt)
  const startOfDay = new Date(`${bookingDateStr}T00:00:00+09:00`)
  const endOfDay = new Date(`${bookingDateStr}T23:59:59+09:00`)

  const todayBookings = await prisma.booking.findMany({
    where: {
      startsAt: { gte: startOfDay, lt: endOfDay },
      status: { not: 'CANCELLED' },
    },
    select: { id: true },
    orderBy: { startsAt: 'asc' },
  })

  const todayBookingIds = todayBookings.map((b) => b.id)

  // Serialize dates to ISO strings for client component
  const serializedBooking = {
    ...booking,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    customer: {
      ...booking.customer,
      lastVisitDate: booking.customer.lastVisitDate?.toISOString() ?? null,
    },
    karuteRecords: booking.karuteRecords.map((kr) => ({
      ...kr,
      createdAt: kr.createdAt.toISOString(),
    })),
    recordingSessions: booking.recordingSessions.map((rs) => ({
      ...rs,
      startedAt: rs.startedAt.toISOString(),
    })),
  }

  return (
    <AppointmentWorkstation
      booking={serializedBooking}
      locale={locale}
      todayBookingIds={todayBookingIds}
    />
  )
}
