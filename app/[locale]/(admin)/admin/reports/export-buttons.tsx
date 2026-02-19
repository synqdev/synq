'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface ExportButtonsProps {
  startDate: string
  endDate: string
  groupBy: string
}

export function ExportButtons({ startDate, endDate, groupBy }: ExportButtonsProps) {
  const t = useTranslations('admin.reportsPage')
  const [downloading, setDownloading] = useState<string | null>(null)

  async function handleDownload(type: 'revenue' | 'bookings') {
    setDownloading(type)
    try {
      const params = new URLSearchParams({ startDate, endDate })
      if (type === 'revenue') params.set('groupBy', groupBy)
      const res = await fetch(`/api/admin/export/${type}?${params}`)
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') ?? `${type}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleDownload('revenue')}
        disabled={downloading !== null}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {downloading === 'revenue' ? t('exporting') : t('exportRevenue')}
      </button>
      <button
        onClick={() => handleDownload('bookings')}
        disabled={downloading !== null}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {downloading === 'bookings' ? t('exporting') : t('exportBookings')}
      </button>
    </div>
  )
}
