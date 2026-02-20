import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth/admin'
import { Card } from '@/components/ui/card'
import { ResourceTable } from './resource-table'
import { ResourceForm } from './resource-form'

interface PageProps {
  params: Promise<{ locale: string }>
}

/**
 * Admin Resources Page
 *
 * CRUD interface for managing resources (beds):
 * - List all resources in a table
 * - Add new resources
 * - Edit existing resources
 * - Soft delete resources (set isActive to false)
 *
 * Note: Resources are physical treatment beds/rooms.
 * A booking requires both a worker AND a resource to be available.
 */
export default async function ResourcesPage({ params }: PageProps) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    redirect('/admin/login')
  }

  const { locale } = await params
  const t = await getTranslations('admin.resourcesPage')

  const resources = await prisma.resource.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">{t('title')}</h1>
        <p className="text-secondary-600 mt-1">{t('subtitle')}</p>
      </div>

      <Card title={t('add')}>
        <ResourceForm mode="create" />
      </Card>

      <Card title={t('title')}>
        <ResourceTable resources={resources} />
      </Card>
    </div>
  )
}
