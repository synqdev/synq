import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getAdminSession } from '@/lib/auth/admin'
import { Card } from '@/components/ui/card'
import { WorkerDetail } from './worker-detail'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function WorkerDetailPage({ params }: PageProps) {
  const { locale, id } = await params
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    redirect(`/${locale}/admin/login`)
  }

  const t = await getTranslations('admin.workerDetail')

  return (
    <div className="space-y-6">
      <Card title={t('title')} className="!overflow-visible">
        <WorkerDetail workerId={id} locale={locale} />
      </Card>
    </div>
  )
}
