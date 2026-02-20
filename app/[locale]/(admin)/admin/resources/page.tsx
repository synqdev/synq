import { redirect } from 'next/navigation'
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
  const { locale } = await params

  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    redirect(`/${locale}/admin/login`)
  }

  const resources = await prisma.resource.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
    },
  })

  const labels = {
    title: locale === 'ja' ? 'ベッド管理' : 'Resource Management',
    subtitle: locale === 'ja' ? '施術ベッド・部屋' : 'Treatment Beds/Rooms',
    addResource: locale === 'ja' ? '新規ベッド追加' : 'Add Resource',
    name: locale === 'ja' ? '名前' : 'Name',
    status: locale === 'ja' ? 'ステータス' : 'Status',
    active: locale === 'ja' ? '有効' : 'Active',
    inactive: locale === 'ja' ? '無効' : 'Inactive',
    actions: locale === 'ja' ? '操作' : 'Actions',
    edit: locale === 'ja' ? '編集' : 'Edit',
    delete: locale === 'ja' ? '削除' : 'Delete',
    save: locale === 'ja' ? '保存' : 'Save',
    cancel: locale === 'ja' ? 'キャンセル' : 'Cancel',
    noResources: locale === 'ja' ? 'ベッドがありません' : 'No resources found',
    confirmDelete: locale === 'ja' ? 'このベッドを削除しますか？' : 'Are you sure you want to delete this resource?',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">{labels.title}</h1>
        <p className="text-secondary-600 mt-1">{labels.subtitle}</p>
      </div>

      <Card title={labels.addResource}>
        <ResourceForm labels={labels} mode="create" />
      </Card>

      <Card title={locale === 'ja' ? 'ベッド一覧' : 'Resource List'}>
        <ResourceTable resources={resources} labels={labels} />
      </Card>
    </div>
  )
}
