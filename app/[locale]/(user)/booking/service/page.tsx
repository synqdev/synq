import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/db/client'
import { getLocalizedName } from '@/lib/i18n/locale'

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
  const tBooking = await getTranslations('booking')
  const tCommon = await getTranslations('common')

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
    <div className="max-w-2xl mx-auto p-6" data-testid="service-page">
      <h1 className="text-3xl font-bold mb-6" data-testid="service-heading">
        {tBooking('selectService')}
      </h1>

      {services.length === 0 ? (
        <p className="text-gray-500 text-center py-12" data-testid="service-empty">
          {tBooking('noServices')}
        </p>
      ) : (
        <form action={selectService} data-testid="service-form">
          <input type="hidden" name="locale" value={locale} />

          <div className="space-y-4">
            {services.map((service) => (
              <button
                key={service.id}
                type="submit"
                name="serviceId"
                value={service.id}
                data-testid="service-option"
                className="w-full text-left p-4 border rounded-lg hover:border-primary-500 hover:bg-primary-50 transition"
              >
                <div className="font-bold text-lg">
                  {getLocalizedName(locale, service.name, service.nameEn)}
                </div>
                <div className="text-gray-600">
                  {service.duration} {tCommon('minutes')} · ¥{service.price.toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </form>
      )}
    </div>
  )
}
