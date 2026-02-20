import { redirect } from 'next/navigation'

interface ServicePageProps {
  params: Promise<{ locale: string }>
}

interface Service {
  id: string
  name: string
  nameEn?: string
  duration: number
  price: number
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
  const servicesResponse = await fetch(`${baseUrl}/api/services`, {
    cache: 'force-cache', // Services change rarely
  })

  if (!servicesResponse.ok) {
    throw new Error(`Failed to fetch services: ${servicesResponse.status}`)
  }

  const services: Service[] = await servicesResponse.json()

  async function selectService(formData: FormData) {
    'use server'
    const serviceId = formData.get('serviceId') as string
    const formLocale = formData.get('locale') as string
    redirect(`/${formLocale}/booking/date?serviceId=${serviceId}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        {locale === 'ja' ? 'サービス選択' : 'Select Service'}
      </h1>

      <form action={selectService}>
        <input type="hidden" name="locale" value={locale} />

        <div className="space-y-4">
          {services.map((service: Service) => (
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
    </div>
  )
}
