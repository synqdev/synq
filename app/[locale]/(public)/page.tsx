import { getTranslations } from 'next-intl/server'

export default async function PublicPage() {
  const t = await getTranslations('welcome')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
      <p className="text-lg text-gray-600">{t('subtitle')}</p>
    </main>
  )
}
