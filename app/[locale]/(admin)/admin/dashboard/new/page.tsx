import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth/admin'
import { prisma } from '@/lib/db/client'
import { toZonedTime } from '@/lib/utils/time'
import { AdminDashboardPrototypeClient } from './prototype-client'

interface AdminDashboardNewPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ date?: string }>
}

export default async function AdminDashboardNewPage({
  params,
  searchParams,
}: AdminDashboardNewPageProps) {
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

  const [workers, bookings] = await Promise.all([
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
  ])

  const [customers, services] = await Promise.all([
    prisma.customer.findMany({
      where: { id: { not: '00000000-0000-0000-0000-000000000000' } },
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
  ])

  const resources = await prisma.resource.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
    },
  })

  return (
    <AdminDashboardPrototypeClient
      locale={locale}
      dateStr={dateStr}
      initialWorkers={workers}
      initialCustomers={customers}
      initialServices={services.map((service) => ({
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
