import { redirect } from 'next/navigation'
import { SlotSelectionClient } from './slot-selection-client'
import { mapAvailabilityToCalendar } from '@/lib/mappers/calendar'

interface SlotsPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ serviceId?: string; date?: string }>
}

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

  if (!serviceId || !date) {
    redirect(`/${locale}/booking/service`)
  }

  // Fetch availability
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const availability = await fetch(
    `${baseUrl}/api/availability?serviceId=${serviceId}&date=${date}`,
    {
      cache: 'no-store', // Availability changes frequently
    }
  ).then(r => r.json())

  // Map to timeline format
  const timelineWorkers = mapAvailabilityToCalendar(availability)

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">
        {locale === 'ja' ? '時間選択' : 'Select Time'}
      </h1>
      <p className="text-gray-600 mb-6">
        {availability.serviceName} · {date}
      </p>

      <SlotSelectionClient
        workers={timelineWorkers}
        serviceId={serviceId}
        date={date}
        locale={locale}
      />

      <a
        href={`/${locale}/booking/date?serviceId=${serviceId}`}
        className="block mt-6 text-center text-gray-600 hover:text-gray-800"
      >
        {locale === 'ja' ? '← 日付選択に戻る' : '← Back to date selection'}
      </a>
    </div>
  )
}
