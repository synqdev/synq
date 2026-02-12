import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth/admin'
import { Card } from '@/components/ui/card'
import { WorkerTable } from './worker-table'
import { WorkerForm } from './worker-form'

interface PageProps {
  params: Promise<{ locale: string }>
}

/**
 * Admin Workers Page
 *
 * CRUD interface for managing workers:
 * - List all workers in a table
 * - Add new workers
 * - Edit existing workers
 * - Soft delete workers (set isActive to false)
 */
export default async function WorkersPage({ params }: PageProps) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    redirect('/admin/login')
  }

  const { locale } = await params
  const t = await getTranslations('admin.workersPage')

  const workers = await prisma.worker.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      nameEn: true,
      isActive: true,
      createdAt: true,
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">{t('title')}</h1>
      </div>

      <Card title={t('add')}>
        <WorkerForm mode="create" />
      </Card>

      <Card title={t('title')}>
        <WorkerTable workers={workers} />
      </Card>
    </div>
  )
}
