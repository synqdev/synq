'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

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
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleDownload('revenue')}
        disabled={downloading !== null}
        loading={downloading === 'revenue'}
      >
        {downloading === 'revenue' ? t('exporting') : t('exportRevenue')}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleDownload('bookings')}
        disabled={downloading !== null}
        loading={downloading === 'bookings'}
      >
        {downloading === 'bookings' ? t('exporting') : t('exportBookings')}
      </Button>
    </div>
  )
}
