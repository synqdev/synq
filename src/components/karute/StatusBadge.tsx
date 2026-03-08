'use client'

interface StatusBadgeProps {
  status: string
  locale?: string
}

const statusStyles: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  REVIEW: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
}

const statusLabels: Record<string, { ja: string; en: string }> = {
  DRAFT: { ja: '下書き', en: 'Draft' },
  REVIEW: { ja: '確認中', en: 'Review' },
  APPROVED: { ja: '承認済', en: 'Approved' },
}

/**
 * Color-coded status badge for karute records.
 * DRAFT=gray, REVIEW=yellow, APPROVED=green.
 */
export function StatusBadge({ status, locale = 'ja' }: StatusBadgeProps) {
  const style = statusStyles[status] || 'bg-gray-100 text-gray-700'
  const labels = statusLabels[status]
  const label = labels
    ? locale === 'en' ? labels.en : labels.ja
    : status

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  )
}
