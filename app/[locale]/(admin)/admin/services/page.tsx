import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth/admin'
import { Card } from '@/components/ui/card'
import { ServiceTable } from './service-table'
import { ServiceForm } from './service-form'

interface PageProps {
  params: Promise<{ locale: string }>
}

/**
 * Admin Services Page
 *
 * CRUD interface for managing services:
 * - List all services in a table
 * - Add new services
 * - Edit existing services
 * - Soft delete services (set isActive to false)
 */
export default async function ServicesPage({ params }: PageProps) {
  const { locale } = await params

  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    redirect(`/${locale}/admin/login`)
  }

  const services = await prisma.service.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      nameEn: true,
      description: true,
      duration: true,
      price: true,
      isActive: true,
      createdAt: true,
    },
  })

  const labels = {
    title: locale === 'ja' ? 'サービス管理' : 'Service Management',
    addService: locale === 'ja' ? '新規サービス追加' : 'Add Service',
    name: locale === 'ja' ? '名前' : 'Name',
    nameEn: locale === 'ja' ? '英語名' : 'English Name',
    description: locale === 'ja' ? '説明' : 'Description',
    duration: locale === 'ja' ? '時間' : 'Duration',
    durationUnit: locale === 'ja' ? '分' : 'min',
    price: locale === 'ja' ? '料金' : 'Price',
    status: locale === 'ja' ? 'ステータス' : 'Status',
    active: locale === 'ja' ? '有効' : 'Active',
    inactive: locale === 'ja' ? '無効' : 'Inactive',
    actions: locale === 'ja' ? '操作' : 'Actions',
    edit: locale === 'ja' ? '編集' : 'Edit',
    delete: locale === 'ja' ? '削除' : 'Delete',
    save: locale === 'ja' ? '保存' : 'Save',
    cancel: locale === 'ja' ? 'キャンセル' : 'Cancel',
    noServices: locale === 'ja' ? 'サービスがありません' : 'No services found',
    confirmDelete: locale === 'ja' ? 'このサービスを削除しますか？' : 'Are you sure you want to delete this service?',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">{labels.title}</h1>
      </div>

      <Card title={labels.addService}>
        <ServiceForm labels={labels} mode="create" />
      </Card>

      <Card title={locale === 'ja' ? 'サービス一覧' : 'Service List'}>
        <ServiceTable services={services} labels={labels} />
      </Card>
    </div>
  )
}
