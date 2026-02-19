import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth/admin'
import { Card } from '@/components/ui/card'
import { CustomerDetail } from './customer-detail'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    redirect('/admin/login')
  }

  const { locale, id } = await params
  const t = await getTranslations('admin.customerDetail')

  const workers = await prisma.worker.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div className="space-y-6">
      <Card title={t('title')} className="!overflow-visible">
        <CustomerDetail customerId={id} locale={locale} workers={workers} />
      </Card>
    </div>
  )
}
