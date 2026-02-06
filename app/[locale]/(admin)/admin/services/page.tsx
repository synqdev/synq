import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
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
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    redirect('/admin/login')
  }

  const { locale } = await params
  const t = await getTranslations('admin.servicesPage')

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">{t('title')}</h1>
      </div>

      <Card title={t('add')}>
        <ServiceForm mode="create" />
      </Card>

      <Card title={t('title')}>
        <ServiceTable services={services} />
      </Card>
    </div>
  )
}
