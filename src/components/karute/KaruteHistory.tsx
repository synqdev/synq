'use client'

import useSWR from 'swr'
import { Spinner } from '@/components/ui/spinner'
import { KaruteHistoryItem, type KaruteHistoryRecord } from './KaruteHistoryItem'

interface KaruteHistoryProps {
  customerId: string
  locale: string
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('Failed to fetch')
    return r.json()
  })

/**
 * Chronological timeline of karute records for a customer.
 * Fetches data via SWR from the customer karute API.
 * Most recent records appear first.
 */
export function KaruteHistory({ customerId, locale }: KaruteHistoryProps) {
  const { data, error, isLoading } = useSWR<KaruteHistoryRecord[]>(
    `/api/admin/customers/${customerId}/karute`,
    fetcher
  )

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Spinner size="lg" className="text-primary-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-red-500">
        {locale === 'ja' ? 'データの読み込みに失敗しました' : 'Failed to load data'}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center text-secondary-500">
        {locale === 'ja' ? 'カルテ記録がありません' : 'No karute records'}
      </div>
    )
  }

  return (
    <div className="relative ml-4 border-l-2 border-secondary-200 pl-6">
      <div className="space-y-3">
        {data.map((record) => (
          <KaruteHistoryItem
            key={record.id}
            record={record}
            locale={locale}
          />
        ))}
      </div>
    </div>
  )
}
