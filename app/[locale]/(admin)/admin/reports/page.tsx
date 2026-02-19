import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getAdminSession } from '@/lib/auth/admin'
import { Card } from '@/components/ui/card'
import { RevenueDashboard } from './revenue-dashboard'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function ReportsPage({ params }: PageProps) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    redirect('/admin/login')
  }

  const { locale } = await params
  const t = await getTranslations('admin.reportsPage')

  return (
    <div className="space-y-6">
      <Card title={t('title')}>
        <RevenueDashboard locale={locale} />
      </Card>
    </div>
  )
}
