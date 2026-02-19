'use client'

import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import type { WorkerRanking } from '@/lib/types/reporting'

interface RankingsSectionProps {
  startDate: string
  endDate: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

function formatJPY(amount: number): string {
  return `\u00A5${amount.toLocaleString()}`
}

const rankStyles: Record<number, string> = {
  1: 'bg-yellow-50 border-yellow-200',
  2: 'bg-gray-50 border-gray-200',
  3: 'bg-orange-50 border-orange-200',
}

const rankBadgeStyles: Record<number, string> = {
  1: 'bg-yellow-100 text-yellow-800',
  2: 'bg-gray-200 text-gray-700',
  3: 'bg-orange-100 text-orange-800',
}

export function RankingsSection({ startDate, endDate }: RankingsSectionProps) {
  const t = useTranslations('admin.reportsPage')
  const url = `/api/admin/reports/rankings?startDate=${startDate}&endDate=${endDate}`

  const { data, isLoading, error } = useSWR<{ rankings: WorkerRanking[] }>(url, fetcher)
  const rankings = data?.rankings ?? []

  if (isLoading) {
    return <div className="py-4 text-center text-sm text-gray-500">{t('loading')}</div>
  }

  if (error) {
    return <div className="py-4 text-center text-sm text-red-500">{t('error')}</div>
  }

  if (rankings.length === 0) {
    return <div className="py-4 text-center text-sm text-gray-400">{t('noData')}</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-2 pr-4 font-medium">{t('rank')}</th>
            <th className="pb-2 pr-4 font-medium">{t('workerName')}</th>
            <th className="pb-2 pr-4 text-right font-medium">{t('revenue')}</th>
            <th className="pb-2 pr-4 text-right font-medium">{t('bookings')}</th>
            <th className="pb-2 text-right font-medium">{t('diffFromFirst')}</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((w) => (
            <tr
              key={w.workerId}
              className={`border-b ${rankStyles[w.rank] ?? 'border-gray-100 hover:bg-gray-50'}`}
            >
              <td className="py-2.5 pr-4">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    rankBadgeStyles[w.rank] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {w.rank}
                </span>
              </td>
              <td className="py-2.5 pr-4 font-medium">{w.workerName}</td>
              <td className="py-2.5 pr-4 text-right font-medium">{formatJPY(w.totalRevenue)}</td>
              <td className="py-2.5 pr-4 text-right">{w.bookingCount}</td>
              <td className="py-2.5 text-right">
                {w.rank === 1 ? (
                  <span className="text-gray-400">---</span>
                ) : (
                  <span className="text-red-500">-{formatJPY(Math.abs(w.differenceFromFirst))}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
