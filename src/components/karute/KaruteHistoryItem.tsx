'use client'

import Link from 'next/link'
import { StatusBadge } from './StatusBadge'

export interface KaruteHistoryRecord {
  id: string
  createdAt: string
  status: string
  workerName: string
  entryCount: number
  bookingDate: string | null
}

interface KaruteHistoryItemProps {
  record: KaruteHistoryRecord
  locale: string
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(
    locale === 'ja' ? 'ja-JP' : 'en-US',
    { year: 'numeric', month: '2-digit', day: '2-digit' }
  )
}

/**
 * Single item in the karute history timeline.
 * Shows date, practitioner name, status badge, and entry count.
 * Links to the karute editor page.
 */
export function KaruteHistoryItem({ record, locale }: KaruteHistoryItemProps) {
  const displayDate = record.bookingDate ?? record.createdAt
  const entriesLabel = locale === 'ja' ? 'エントリ' : 'entries'

  return (
    <Link
      href={`/${locale}/admin/karute/${record.id}`}
      className="group relative flex items-center gap-4 rounded-lg border border-secondary-200 bg-white p-3 transition-colors hover:border-primary-300 hover:bg-primary-50"
    >
      {/* Timeline dot */}
      <div className="absolute -left-[25px] h-3 w-3 rounded-full border-2 border-primary-400 bg-white group-hover:bg-primary-400" />

      {/* Date */}
      <div className="min-w-[90px] text-sm font-medium text-secondary-700">
        {formatDate(displayDate, locale)}
      </div>

      {/* Practitioner */}
      <div className="flex-1 text-sm text-secondary-600">
        {record.workerName}
      </div>

      {/* Entry count */}
      <span className="rounded-full bg-secondary-100 px-2 py-0.5 text-xs text-secondary-600">
        {record.entryCount} {entriesLabel}
      </span>

      {/* Status */}
      <StatusBadge status={record.status} locale={locale} />
    </Link>
  )
}
