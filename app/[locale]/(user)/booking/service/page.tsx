import { redirect } from 'next/navigation'

interface ServicePageProps {
  params: Promise<{ locale: string }>
}

/**
 * Service Selection Page
 *
 * First step in the booking flow.
 * User selects which service they want to book.
 * Redirects to date selection with serviceId parameter.
 */
export default async function ServiceSelectionPage({ params }: ServicePageProps) {
  const { locale } = await params

  // Fetch services from API
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  let services: any[] = []
  let error = null

  try {
    const response = await fetch(`${baseUrl}/api/services`, {
      cache: 'force-cache', // Services change rarely
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch services: ${response.status}`)
    }

    const data = await response.json()
    services = Array.isArray(data) ? data : []
  } catch (e) {
    console.error('Failed to fetch services:', e)
    error = e instanceof Error ? e.message : 'Failed to load services'
  }

  async function selectService(formData: FormData) {
    'use server'
    const serviceId = formData.get('serviceId') as string
    const locale = formData.get('locale') as string
    redirect(`/${locale}/booking/date?serviceId=${serviceId}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        {locale === 'ja' ? 'サービス選択' : 'Select Service'}
      </h1>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600 font-bold mb-2">
            {locale === 'ja' ? 'エラー' : 'Error'}
          </p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <p className="text-gray-600 text-sm">
            {locale === 'ja'
              ? 'サーバーを再起動してください: npm run dev'
              : 'Please restart the server: npm run dev'}
          </p>
        </div>
      ) : services.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          {locale === 'ja' ? 'サービスがありません' : 'No services available'}
        </p>
      ) : (
        <form action={selectService}>
          <input type="hidden" name="locale" value={locale} />

          <div className="space-y-4">
            {services.map((service: any) => (
              <button
                key={service.id}
                type="submit"
                name="serviceId"
                value={service.id}
                className="w-full text-left p-4 border rounded-lg hover:border-primary-500 hover:bg-primary-50 transition"
              >
                <div className="font-bold text-lg">
                  {locale === 'ja' ? service.name : service.nameEn || service.name}
                </div>
                <div className="text-gray-600">
                  {service.duration} {locale === 'ja' ? '分' : 'min'} · ¥{service.price.toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </form>
      )}
    </div>
  )
}
