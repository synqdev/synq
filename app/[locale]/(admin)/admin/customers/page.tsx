import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth/admin'
import { Card } from '@/components/ui/card'
import { CustomerList } from './customer-list'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function CustomersPage({ params }: PageProps) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    redirect('/admin/login')
  }

  const { locale } = await params
  const t = await getTranslations('admin.customersPage')

  const workers = await prisma.worker.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">{t('title')}</h1>
      </div>

      <Card title={t('title')}>
        <CustomerList locale={locale} workers={workers} />
      </Card>
    </div>
  )
}
