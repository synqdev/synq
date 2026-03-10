'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { Spinner } from '@/components/ui/spinner'
import { ScheduleEditor } from './schedule/schedule-editor'

interface DaySchedule {
  dayOfWeek: number
  startTime: string
  endTime: string
  isAvailable: boolean
}

interface WorkerStats {
  totalRevenue: number
  bookingCount: number
  averagePerBooking: number
}

interface WorkerDetailData {
  id: string
  name: string
  nameEn: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  totalBookings: number
  assignedCustomers: number
  schedules: DaySchedule[]
  stats: WorkerStats
}

interface WorkerDetailProps {
  workerId: string
  locale: string
}

const fetcher = async (url: string): Promise<WorkerDetailData> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch worker')
  return response.json()
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(
    locale === 'ja' ? 'ja-JP' : 'en-US',
    { year: 'numeric', month: '2-digit', day: '2-digit' }
  )
}

function formatYen(value: number) {
  return `¥${value.toLocaleString('ja-JP')}`
}

export function WorkerDetail({ workerId, locale }: WorkerDetailProps) {
  const t = useTranslations('admin.workerDetail')
  const tCommon = useTranslations('common')

  const { data: worker, error, isLoading } = useSWR<WorkerDetailData>(
    `/api/admin/workers/${workerId}`,
    fetcher
  )

  const [activeTab, setActiveTab] = useState<'schedule' | 'performance'>('schedule')

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Spinner size="lg" className="text-primary-500" />
      </div>
    )
  }

  if (error || !worker) {
    return (
      <div className="py-8 text-center">
        <p className="text-error-600">{t('notFound')}</p>
        <Link
          href={`/${locale}/admin/workers`}
          className="mt-4 inline-block text-primary-600 hover:underline"
        >
          {t('backToList')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/admin/workers`}
        className="inline-block text-sm text-primary-600 hover:underline"
      >
        &larr; {t('backToList')}
      </Link>

      {/* Worker Info (always visible) */}
      <section className="rounded-lg border border-secondary-200 p-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-secondary-900">{worker.name}</h2>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              worker.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {worker.isActive ? tCommon('active') : tCommon('inactive')}
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {worker.nameEn && (
            <div>
              <span className="text-sm text-secondary-500">{t('nameEn')}</span>
              <p className="font-medium">{worker.nameEn}</p>
            </div>
          )}
          <div>
            <span className="text-sm text-secondary-500">{t('createdAt')}</span>
            <p className="font-medium">{formatDate(worker.createdAt, locale)}</p>
          </div>
          <div>
            <span className="text-sm text-secondary-500">{t('totalBookings')}</span>
            <p className="font-medium">{worker.totalBookings}</p>
          </div>
          <div>
            <span className="text-sm text-secondary-500">{t('assignedCustomers')}</span>
            <p className="font-medium">{worker.assignedCustomers}</p>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="flex border-b border-secondary-200">
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'schedule'
              ? 'border-b-2 border-primary-500 text-primary-600'
              : 'text-secondary-500 hover:text-secondary-700'
          }`}
        >
          {t('schedule')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'performance'
              ? 'border-b-2 border-primary-500 text-primary-600'
              : 'text-secondary-500 hover:text-secondary-700'
          }`}
        >
          {t('performance')}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'schedule' ? (
        <ScheduleEditor workerId={workerId} initialSchedules={worker.schedules} />
      ) : (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-secondary-900">{t('performance')}</h3>
          {worker.stats.bookingCount === 0 ? (
            <p className="py-8 text-center text-secondary-500">{t('noBookings')}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-secondary-200 p-4 text-center">
                <p className="text-sm text-secondary-500">{t('totalRevenue')}</p>
                <p className="mt-1 text-2xl font-bold text-secondary-900">
                  {formatYen(worker.stats.totalRevenue)}
                </p>
              </div>
              <div className="rounded-lg border border-secondary-200 p-4 text-center">
                <p className="text-sm text-secondary-500">{t('bookingCount')}</p>
                <p className="mt-1 text-2xl font-bold text-secondary-900">
                  {worker.stats.bookingCount}
                </p>
              </div>
              <div className="rounded-lg border border-secondary-200 p-4 text-center">
                <p className="text-sm text-secondary-500">{t('avgPerBooking')}</p>
                <p className="mt-1 text-2xl font-bold text-secondary-900">
                  {formatYen(worker.stats.averagePerBooking)}
                </p>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
