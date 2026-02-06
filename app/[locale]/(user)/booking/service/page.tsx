import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'

interface ServicePageProps {
  params: Promise<{ locale: string }>
}

// Revalidate this page every 5 minutes (services change rarely)
export const revalidate = 300

/**
 * Service Selection Page
 *
 * First step in the booking flow.
 * User selects which service they want to book.
 * Redirects to date selection with serviceId parameter.
 */
export default async function ServiceSelectionPage({ params }: ServicePageProps) {
  const { locale } = await params

  // Fetch services directly from database (much faster than API call)
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })

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

      {services.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          {locale === 'ja' ? 'サービスがありません' : 'No services available'}
        </p>
      ) : (
        <form action={selectService}>
          <input type="hidden" name="locale" value={locale} />

          <div className="space-y-4">
            {services.map((service) => (
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
