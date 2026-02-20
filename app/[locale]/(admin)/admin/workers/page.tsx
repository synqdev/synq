import { redirect } from 'next/navigation'
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
  const { locale } = await params

  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    redirect(`/${locale}/admin/login`)
  }

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

  const labels = {
    title: locale === 'ja' ? 'スタッフ管理' : 'Worker Management',
    addWorker: locale === 'ja' ? '新規スタッフ追加' : 'Add Worker',
    name: locale === 'ja' ? '名前' : 'Name',
    nameEn: locale === 'ja' ? '英語名' : 'English Name',
    status: locale === 'ja' ? 'ステータス' : 'Status',
    active: locale === 'ja' ? '有効' : 'Active',
    inactive: locale === 'ja' ? '無効' : 'Inactive',
    actions: locale === 'ja' ? '操作' : 'Actions',
    edit: locale === 'ja' ? '編集' : 'Edit',
    delete: locale === 'ja' ? '削除' : 'Delete',
    save: locale === 'ja' ? '保存' : 'Save',
    cancel: locale === 'ja' ? 'キャンセル' : 'Cancel',
    noWorkers: locale === 'ja' ? 'スタッフがいません' : 'No workers found',
    confirmDelete: locale === 'ja' ? 'このスタッフを削除しますか？' : 'Are you sure you want to delete this worker?',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">{labels.title}</h1>
      </div>

      <Card title={labels.addWorker}>
        <WorkerForm labels={labels} mode="create" />
      </Card>

      <Card title={locale === 'ja' ? 'スタッフ一覧' : 'Worker List'}>
        <WorkerTable workers={workers} labels={labels} />
      </Card>
    </div>
  )
}
