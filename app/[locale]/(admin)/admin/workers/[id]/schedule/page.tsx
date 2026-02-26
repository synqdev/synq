import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth/admin'
import { ScheduleEditor } from './schedule-editor'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

/**
 * Admin Worker Schedule Page
 *
 * Server component that loads worker data and existing recurring schedules,
 * then renders the ScheduleEditor client component for editing the 7-day
 * weekly schedule.
 */
export default async function WorkerSchedulePage({ params }: PageProps) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    redirect('/admin/login')
  }

  const { id } = await params
  const t = await getTranslations('admin.schedulePage')

  const worker = await prisma.worker.findUnique({ where: { id } })
  if (!worker) {
    notFound()
  }

  const existingSchedules = await prisma.workerSchedule.findMany({
    where: { workerId: id, specificDate: null },
    orderBy: { dayOfWeek: 'asc' },
  })

  // Build initial schedule data for all 7 days (0=Sunday through 6=Saturday)
  // Use existing DB record if found, otherwise use safe defaults with isAvailable=false
  const schedules = Array.from({ length: 7 }, (_, i) => {
    const existing = existingSchedules.find((s) => s.dayOfWeek === i)
    if (existing) {
      return {
        dayOfWeek: i,
        startTime: existing.startTime,
        endTime: existing.endTime,
        isAvailable: existing.isAvailable,
      }
    }
    return {
      dayOfWeek: i,
      startTime: '09:00',
      endTime: '18:00',
      isAvailable: false,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/workers"
          className="text-sm text-primary-600 hover:text-primary-800 hover:underline"
        >
          ← {t('backToWorkers')}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-secondary-900">
          {t('subtitle', { name: worker.name })}
        </h1>
      </div>

      <ScheduleEditor workerId={id} initialSchedules={schedules} />
    </div>
  )
}
