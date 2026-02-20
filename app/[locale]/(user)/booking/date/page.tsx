import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { getLocalizedName } from '@/lib/i18n/locale'

interface DatePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ serviceId?: string }>
}

/**
 * Date Selection Page
 *
 * Second step in the booking flow.
 * User selects the date for their appointment.
 * Redirects to slot selection with serviceId and date parameters.
 */
export default async function DateSelectionPage({ params, searchParams }: DatePageProps) {
  const { locale } = await params
  const { serviceId } = await searchParams
  const tBooking = await getTranslations('booking')
  const tCommon = await getTranslations('common')

  if (!serviceId) {
    redirect(`/${locale}/booking/service`)
  }

  // Fetch service details
  // Get the host from request headers for server-side fetch
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`

  const services = await fetch(`${baseUrl}/api/services`, {
    cache: 'force-cache',
  }).then(r => r.json())

  const service = services.find((s: any) => s.id === serviceId)

  if (!service) {
    redirect(`/${locale}/booking/service`)
  }

  async function selectDate(formData: FormData) {
    'use server'
    const date = formData.get('date') as string
    const serviceId = formData.get('serviceId') as string
    const locale = formData.get('locale') as string
    redirect(`/${locale}/booking/slots?serviceId=${serviceId}&date=${date}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-6" data-testid="date-page">
      <h1 className="text-3xl font-bold mb-2" data-testid="date-heading">
        {tBooking('selectDate')}
      </h1>
      <p className="text-gray-600 mb-6">
        {getLocalizedName(locale, service.name, service.nameEn)} ({service.duration}
        {tCommon('minutes')})
      </p>

      <form action={selectDate} data-testid="date-form">
        <input type="hidden" name="serviceId" value={serviceId} />
        <input type="hidden" name="locale" value={locale} />

        <input
          type="date"
          name="date"
          min={new Date().toISOString().split('T')[0]}
          required
          data-testid="date-input"
          className="w-full p-3 border rounded-lg text-lg"
        />

        <button
          type="submit"
          data-testid="date-next"
          className="w-full mt-4 bg-primary-500 text-white py-3 rounded-lg font-bold hover:bg-primary-600 transition"
        >
          {tCommon('next')}
        </button>
      </form>

      <a
        data-testid="date-back"
        href={`/${locale}/booking/service`}
        className="block mt-4 text-center text-gray-600 hover:text-gray-800"
      >
        {tBooking('backToService')}
      </a>
    </div>
  )
}
