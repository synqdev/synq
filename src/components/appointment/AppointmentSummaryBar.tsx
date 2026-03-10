'use client'

import { useTranslations } from 'next-intl'

interface AppointmentSummaryBarProps {
  customerName: string
  serviceName: string
  workerName: string
  startsAt: string
  endsAt: string
  status: string
}

const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NOSHOW: 'bg-gray-100 text-gray-600',
}

function formatTimeRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const fmt = (d: Date) =>
    d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${fmt(start)} - ${fmt(end)}`
}

export function AppointmentSummaryBar({
  customerName,
  serviceName,
  workerName,
  startsAt,
  endsAt,
  status,
}: AppointmentSummaryBarProps) {
  const t = useTranslations('admin.appointment.summaryBar')

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">{t('customer')}</span>
        <span className="text-sm font-semibold text-gray-900">{customerName}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">{t('service')}</span>
        <span className="text-sm text-gray-700">{serviceName}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">{t('worker')}</span>
        <span className="text-sm text-gray-700">{workerName}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">{t('time')}</span>
        <span className="text-sm text-gray-700">{formatTimeRange(startsAt, endsAt)}</span>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[status] ?? 'bg-gray-100 text-gray-600'}`}
      >
        {status}
      </span>
    </div>
  )
}
