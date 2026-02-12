import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { SlotSelectionClient } from './slot-selection-client'
import { mapAvailabilityToCalendar } from '@/lib/mappers/calendar'

interface SlotsPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ serviceId?: string; date?: string }>
}

// Force dynamic rendering - availability changes with each booking
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Slot Selection Page
 *
 * Third step in the booking flow.
 * Shows EmployeeTimeline with available slots for selected service and date.
 * User clicks on an available slot to proceed to confirmation.
 */
export default async function SlotSelectionPage({ params, searchParams }: SlotsPageProps) {
  const { locale } = await params
  const { serviceId, date } = await searchParams
  const tBooking = await getTranslations('booking')
  const tCommon = await getTranslations('common')

  if (!serviceId || !date) {
    redirect(`/${locale}/booking/service`)
  }

  // Fetch availability
  // Get the host from request headers for server-side fetch
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`

  let availability
  let error = null

  try {
    const response = await fetch(
      `${baseUrl}/api/availability?serviceId=${serviceId}&date=${date}`,
      {
        cache: 'no-store', // Availability changes frequently
      }
    )

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }

    availability = await response.json()
  } catch (e) {
    console.error('Failed to fetch availability:', e)
    error = e instanceof Error ? e.message : 'Failed to fetch availability'
  }

  // Map to timeline format (only if we have data)
  const timelineWorkers = availability ? mapAvailabilityToCalendar(availability) : []

  return (
    <div className="max-w-[828px] mx-auto p-6" data-testid="slots-page">
      <h1 className="text-3xl font-bold mb-2" data-testid="slots-heading">
        {tBooking('selectTimeTitle')}
      </h1>
      {availability && (
        <p className="text-gray-600 mb-6" data-testid="slots-service">
          {availability.serviceName} · {date}
        </p>
      )}

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center" data-testid="slots-error">
          <p className="text-red-600 font-bold mb-2">{tCommon('error')}</p>
          <p className="text-red-500 text-sm mb-4" data-testid="slots-error-message">{error}</p>
          <p className="text-gray-600 text-sm">
            {tBooking('seedRequired')}
          </p>
        </div>
      ) : timelineWorkers.length === 0 ? (
        <p className="text-gray-500 text-center py-12" data-testid="slots-empty">
          {tBooking('noAvailability')}
        </p>
      ) : (
        <SlotSelectionClient
          workers={timelineWorkers}
          serviceId={serviceId}
          date={date}
          locale={locale}
        />
      )}

      <a
        data-testid="slots-back"
        href={`/${locale}/booking/date?serviceId=${serviceId}`}
        className="block mt-6 text-center text-gray-600 hover:text-gray-800"
      >
        {tBooking('backToDate')}
      </a>
    </div>
  )
}
