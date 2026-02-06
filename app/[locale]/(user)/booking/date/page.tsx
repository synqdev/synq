import { redirect } from 'next/navigation'

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

  if (!serviceId) {
    redirect(`/${locale}/booking/service`)
  }

  // Fetch service details
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
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
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">
        {locale === 'ja' ? '日付選択' : 'Select Date'}
      </h1>
      <p className="text-gray-600 mb-6">
        {locale === 'ja' ? service.name : service.nameEn || service.name} ({service.duration}
        {locale === 'ja' ? '分' : 'min'})
      </p>

      <form action={selectDate}>
        <input type="hidden" name="serviceId" value={serviceId} />
        <input type="hidden" name="locale" value={locale} />

        <input
          type="date"
          name="date"
          min={new Date().toISOString().split('T')[0]}
          required
          className="w-full p-3 border rounded-lg text-lg"
        />

        <button
          type="submit"
          className="w-full mt-4 bg-primary-500 text-white py-3 rounded-lg font-bold hover:bg-primary-600 transition"
        >
          {locale === 'ja' ? '次へ' : 'Next'}
        </button>
      </form>

      <a
        href={`/${locale}/booking/service`}
        className="block mt-4 text-center text-gray-600 hover:text-gray-800"
      >
        {locale === 'ja' ? '← サービス選択に戻る' : '← Back to service selection'}
      </a>
    </div>
  )
}
