import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/db/client'
import { BookingSelectionForm } from './booking-selection-form'

interface BookingPageProps {
  params: Promise<{ locale: string }>
}

/**
 * Unified Booking Page
 * 
 * Combines Service and Date selection into a single step.
 */
export default async function BookingPage({ params }: BookingPageProps) {
  const { locale } = await params
  const tBooking = await getTranslations('booking')
  const cookieStore = await cookies()
  const customerId = cookieStore.get('customerId')?.value

  if (!customerId) {
    // No customer ID - send to registration
    // We send them back to this page (/booking) after registration
    redirect(`/${locale}/register?redirect=${encodeURIComponent(`/${locale}/booking`)}`)
  }

  // Fetch active services
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="max-w-xl mx-auto p-6 md:p-8" data-testid="booking-page">
      <h1 className="text-3xl font-black mb-8 text-center uppercase tracking-tight" data-testid="booking-heading">
        {tBooking('detailsTitle')}
      </h1>

      <BookingSelectionForm services={services} locale={locale} />
    </div>
  )
}
