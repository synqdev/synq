import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getAdminSession } from '@/lib/auth/admin'
import { Card } from '@/components/ui/card'
import { KaruteEditor } from '@/components/karute/KaruteEditor'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function KaruteEditorPage({ params }: PageProps) {
  const { locale, id } = await params
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    redirect(`/${locale}/admin/login`)
  }

  const t = await getTranslations('admin.karuteEditor')

  return (
    <div className="space-y-6">
      <Card title={t('title')} className="!overflow-visible">
        <KaruteEditor recordId={id} locale={locale} />
      </Card>
    </div>
  )
}
