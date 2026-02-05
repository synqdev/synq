import { getTranslations } from 'next-intl/server'

export default async function BookingPage() {
  const t = await getTranslations('booking')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
      <p className="text-gray-600">{t('selectTime')}</p>
      {/* TODO: Implement booking calendar in Plan 03 */}
    </div>
  )
}
