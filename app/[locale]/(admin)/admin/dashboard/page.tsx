import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth/admin'
import { prisma } from '@/lib/db/client'
import { toZonedTime } from '@/lib/utils/time'
import { AdminDashboardPrototypeClient } from './prototype-client'

interface AdminDashboardPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ date?: string }>
}

interface InitialService {
  id: string
  name: string
  duration: number
}

// System/placeholder customer excluded from bookable customer list
const SYSTEM_CUSTOMER_ID = '00000000-0000-0000-0000-000000000000'

export default async function AdminDashboardPage({
  params,
  searchParams,
}: AdminDashboardPageProps) {
  const { locale } = await params
  const { date: dateParam } = await searchParams

  const isAuthenticated = await getAdminSession()
  if (!isAuthenticated) {
    redirect(`/${locale}/admin/login`)
  }

  const dateStr = dateParam || new Date().toISOString().split('T')[0]

  const startOfDay = toZonedTime(dateStr, '00:00')
  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)

  const [workers, bookings, customers, services, resources] = await Promise.all([
    prisma.worker.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        nameEn: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.booking.findMany({
      where: {
        startsAt: { gte: startOfDay, lt: endOfDay },
        status: { not: 'CANCELLED' },
      },
      include: {
        customer: {
          select: { name: true },
        },
        service: {
          select: { name: true },
        },
      },
      orderBy: { startsAt: 'asc' },
    }),
    prisma.customer.findMany({
      where: { id: { not: SYSTEM_CUSTOMER_ID } },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        nameEn: true,
        description: true,
        duration: true,
        price: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.resource.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    }),
  ])

  return (
    <AdminDashboardPrototypeClient
      locale={locale}
      dateStr={dateStr}
      initialWorkers={workers}
      initialCustomers={customers}
      initialServices={services.map((service: InitialService) => ({
        id: service.id,
        name: service.name,
        duration: service.duration,
      }))}
      initialWorkerCrud={workers}
      initialServiceCrud={services}
      initialResourceCrud={resources}
      initialBookings={bookings.map((booking) => ({
        id: booking.id,
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
        workerId: booking.workerId,
        serviceId: booking.serviceId,
        customerName: booking.customer.name,
        serviceName: booking.service.name,
      }))}
    />
  )
}
