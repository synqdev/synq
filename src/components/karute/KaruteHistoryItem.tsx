'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StatusBadge } from './StatusBadge'

interface KaruteEntry {
  category: string
  content: string
}

export interface KaruteHistoryRecord {
  id: string
  createdAt: string
  status: string
  aiSummary: string | null
  workerName: string
  entryCount: number
  bookingId: string | null
  bookingDate: string | null
  entries?: KaruteEntry[]
}

interface KaruteHistoryItemProps {
  record: KaruteHistoryRecord
  locale: string
}

const categoryLabels: Record<string, { en: string; ja: string }> = {
  SYMPTOM: { en: 'Symptoms', ja: '症状' },
  TREATMENT: { en: 'Treatment', ja: '施術' },
  BODY_AREA: { en: 'Body Area', ja: '部位' },
  PREFERENCE: { en: 'Preference', ja: '好み' },
  LIFESTYLE: { en: 'Lifestyle', ja: '生活習慣' },
  NEXT_VISIT: { en: 'Next Visit', ja: '次回予約' },
  OTHER: { en: 'Other', ja: 'その他' },
}

function getCategoryLabel(category: string, locale: string): string {
  const labels = categoryLabels[category]
  if (!labels) return category
  return locale === 'ja' ? labels.ja : labels.en
}

function groupEntries(entries: KaruteEntry[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  for (const entry of entries) {
    if (!groups[entry.category]) groups[entry.category] = []
    groups[entry.category].push(entry.content)
  }
  return groups
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(
    locale === 'ja' ? 'ja-JP' : 'en-US',
    { year: 'numeric', month: '2-digit', day: '2-digit' }
  )
}

/**
 * Single item in the karute history timeline.
 * Click to expand/collapse the full record details (mirrors PDF output).
 * Contains links to the appointment and karute editor.
 */
export function KaruteHistoryItem({ record, locale }: KaruteHistoryItemProps) {
  const [expanded, setExpanded] = useState(false)
  const displayDate = record.bookingDate ?? record.createdAt
  const entriesLabel = locale === 'ja' ? 'エントリ' : 'entries'
  const grouped = record.entries && record.entries.length > 0 ? groupEntries(record.entries) : null

  return (
    <div className="group relative">
      {/* Timeline dot */}
      <div className="absolute -left-[25px] top-4 h-3 w-3 rounded-full border-2 border-primary-400 bg-white group-hover:bg-primary-400" />

      <div
        className={`rounded-lg border bg-white transition-colors cursor-pointer ${
          expanded ? 'border-primary-300 shadow-sm' : 'border-secondary-200 hover:border-primary-300 hover:bg-primary-50'
        }`}
      >
        {/* Header row — click to expand/collapse */}
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center gap-4 p-3 text-left"
        >
          {/* Expand indicator */}
          <svg
            className={`h-4 w-4 flex-shrink-0 text-secondary-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>

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
        </button>

        {/* Expanded detail panel */}
        {expanded && (
          <div className="border-t border-secondary-100 px-3 pb-3 pt-2">
            {/* AI Summary */}
            {record.aiSummary && (
              <div className="mb-3">
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-secondary-400">
                  {locale === 'ja' ? 'サマリー' : 'Summary'}
                </h4>
                <p className="text-sm text-secondary-600">{record.aiSummary}</p>
              </div>
            )}

            {/* Entries by category */}
            {grouped && (
              <div className="space-y-2">
                {Object.entries(grouped).map(([category, contents]) => (
                  <div key={category}>
                    <h4 className="text-xs font-semibold text-secondary-500">
                      {getCategoryLabel(category, locale)}
                    </h4>
                    <ul className="mt-0.5 space-y-0.5">
                      {contents.map((content, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-secondary-600">
                          <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-secondary-400" />
                          {content}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* No entries and no summary */}
            {!grouped && !record.aiSummary && (
              <p className="text-sm text-secondary-400">
                {locale === 'ja' ? '記録なし' : 'No records yet'}
              </p>
            )}

            {/* Action links */}
            <div className="mt-3 flex items-center gap-2 border-t border-secondary-100 pt-2">
              <Link
                href={`/${locale}/admin/karute/${record.id}`}
                className="rounded-md bg-primary-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-600"
              >
                {locale === 'ja' ? 'カルテを編集' : 'Edit Karute'}
              </Link>
              {record.bookingId && (
                <Link
                  href={`/${locale}/appointment/${record.bookingId}`}
                  className="rounded-md border border-secondary-300 px-3 py-1 text-xs font-medium text-secondary-600 transition-colors hover:bg-secondary-50"
                >
                  {locale === 'ja' ? '予約を表示' : 'View Appointment'}
                </Link>
              )}
              <a
                href={`/api/admin/karute/${record.id}/export?format=pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-secondary-300 px-3 py-1 text-xs font-medium text-secondary-600 transition-colors hover:bg-secondary-50"
              >
                PDF
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
