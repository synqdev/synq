import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export default async function PublicPage() {
  const t = await getTranslations('welcome')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
      <p className="text-lg text-gray-600 mb-8">{t('subtitle')}</p>
      <div className="flex gap-4">
        <Link
          href="/booking"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('bookNow')}
        </Link>
      </div>
    </main>
  )
}
