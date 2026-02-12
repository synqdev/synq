import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/client'
import { toZonedTime } from '@/lib/utils/time'

import { BookingPreview } from './booking-preview-client'

interface PreviewPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    serviceId?: string
    date?: string
    workerId?: string
    time?: string
    resourceId?: string
  }>
}

/**
 * Booking Preview Page
 *
 * Shows booking details before confirmation.
 * User can review and confirm the booking.
 */
export default async function PreviewPage({ params, searchParams }: PreviewPageProps) {
  const { locale } = await params
  const { serviceId, date, workerId, time, resourceId } = await searchParams

  // Check for customer session
  const cookieStore = await cookies()
  const customerId = cookieStore.get('customerId')?.value

  if (!customerId) {
    redirect(`/${locale}/register`)
  }

  // Validate required parameters
  if (!serviceId || !date || !workerId || !time || !resourceId) {
    redirect(`/${locale}/booking/service`)
  }

  // Fetch service, worker, and customer data
  const [service, worker, customer] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    prisma.worker.findUnique({ where: { id: workerId } }),
    prisma.customer.findUnique({ where: { id: customerId } }),
  ])

  if (!service || !worker || !customer) {
    redirect(`/${locale}/booking/service`)
  }

  // Calculate end time
  const startTime = toZonedTime(date, time)

  const endTime = new Date(startTime)
  endTime.setMinutes(endTime.getMinutes() + service.duration)

  return (
    <BookingPreview
      locale={locale}
      service={service}
      worker={worker}
      customer={customer}
      startTime={startTime}
      endTime={endTime}
      resourceId={resourceId}
    />
  )
}
