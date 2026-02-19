'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { RankingsSection } from './rankings-section'
import type { RevenuePeriod, DashboardTotals, WorkerMetric } from '@/lib/types/reporting'

interface RevenueDashboardProps {
  locale: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

function formatJPY(amount: number): string {
  return `\u00A5${amount.toLocaleString()}`
}

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getPresetRange(preset: string): { start: Date; end: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (preset) {
    case 'today': {
      const end = new Date(today)
      end.setDate(end.getDate() + 1)
      return { start: today, end }
    }
    case 'thisWeek': {
      const dayOfWeek = today.getDay()
      const start = new Date(today)
      start.setDate(start.getDate() - dayOfWeek)
      const end = new Date(start)
      end.setDate(end.getDate() + 7)
      return { start, end }
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      return { start, end }
    }
    case 'last30': {
      const start = new Date(today)
      start.setDate(start.getDate() - 30)
      const end = new Date(today)
      end.setDate(end.getDate() + 1)
      return { start, end }
    }
    default:
      return { start: today, end: new Date(today.getTime() + 86400000) }
  }
}

function formatPeriodLabel(isoString: string, groupBy: string, locale: string): string {
  const date = new Date(isoString)
  if (groupBy === 'day') {
    return date.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
      month: 'short',
      day: 'numeric',
    })
  }
  if (groupBy === 'week') {
    const weekStart = new Date(date)
    const weekEnd = new Date(date)
    weekEnd.setDate(weekEnd.getDate() + 6)
    return `${weekStart.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric' })}`
  }
  // month
  return date.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'long',
  })
}

export function RevenueDashboard({ locale }: RevenueDashboardProps) {
  const t = useTranslations('admin.reportsPage')

  const defaultRange = getPresetRange('thisMonth')
  const [startDate, setStartDate] = useState(toDateString(defaultRange.start))
  const [endDate, setEndDate] = useState(toDateString(defaultRange.end))
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')

  const revenueUrl = `/api/admin/reports/revenue?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`
  const workersUrl = `/api/admin/reports/workers?startDate=${startDate}&endDate=${endDate}`
  const retentionUrl = `/api/admin/reports/retention?startDate=${startDate}&endDate=${endDate}`

  const { data: revenueData, isLoading: revenueLoading, error: revenueError } = useSWR<{
    summary: RevenuePeriod[]
    totals: DashboardTotals
  }>(revenueUrl, fetcher)

  const { data: workersData, isLoading: workersLoading, error: workersError } = useSWR<{
    workers: WorkerMetric[]
  }>(workersUrl, fetcher)

  const { data: retentionData, isLoading: retentionLoading, error: retentionError } = useSWR<{
    totalCustomers: number
    repeatCustomers: number
    repeatRate: number
    newCustomers: number
  }>(retentionUrl, fetcher)

  const totals = revenueData?.totals
  const summary = revenueData?.summary ?? []
  const workers = workersData?.workers ?? []
  const hasError = !!(revenueError || workersError || retentionError)

  const summaryTotals = useMemo(() => {
    return summary.reduce(
      (acc, row) => ({
        totalRevenue: acc.totalRevenue + row.totalRevenue,
        bookingCount: acc.bookingCount + row.bookingCount,
        newCustomerCount: acc.newCustomerCount + row.newCustomerCount,
        existingCustomerCount: acc.existingCustomerCount + row.existingCustomerCount,
      }),
      { totalRevenue: 0, bookingCount: 0, newCustomerCount: 0, existingCustomerCount: 0 }
    )
  }, [summary])

  function applyPreset(preset: string) {
    const range = getPresetRange(preset)
    setStartDate(toDateString(range.start))
    setEndDate(toDateString(range.end))
  }

  const isLoading = revenueLoading || workersLoading || retentionLoading

  return (
    <div className="space-y-6">
      {/* Date Range Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-2">
          {(['today', 'thisWeek', 'thisMonth', 'last30'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t(`preset.${preset}`)}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <label className="text-sm text-gray-600">
            {t('startDate')}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="ml-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-sm text-gray-600">
            {t('endDate')}
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="ml-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        <div className="flex rounded-md border border-gray-300">
          {(['day', 'week', 'month'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`px-3 py-1.5 text-sm font-medium ${
                groupBy === g
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } ${g === 'day' ? 'rounded-l-md' : g === 'month' ? 'rounded-r-md' : ''}`}
            >
              {t(`groupBy.${g}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      {hasError ? (
        <div className="py-8 text-center text-red-500">{t('error')}</div>
      ) : isLoading ? (
        <div className="py-8 text-center text-gray-500">{t('loading')}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <SummaryCard label={t('totalRevenue')} value={formatJPY(totals?.totalRevenue ?? 0)} />
            <SummaryCard label={t('totalBookings')} value={String(totals?.totalBookings ?? 0)} />
            <SummaryCard label={t('uniqueCustomers')} value={String(totals?.uniqueCustomers ?? 0)} />
            <SummaryCard label={t('avgPerBooking')} value={formatJPY(totals?.averageRevenuePerBooking ?? 0)} />
            <SummaryCard
              label={t('repeatRate')}
              value={`${retentionData?.repeatRate ?? 0}%`}
              subtitle={retentionData ? `${retentionData.repeatCustomers} / ${retentionData.totalCustomers}` : undefined}
            />
          </div>

          {/* Revenue Table */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">{t('revenueBreakdown')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-2 pr-4 font-medium">{t('period')}</th>
                    <th className="pb-2 pr-4 text-right font-medium">{t('revenue')}</th>
                    <th className="pb-2 pr-4 text-right font-medium">{t('bookings')}</th>
                    <th className="pb-2 pr-4 text-right font-medium">{t('newCustomers')}</th>
                    <th className="pb-2 text-right font-medium">{t('existingCustomers')}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-gray-400">
                        {t('noData')}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {summary.map((row) => (
                        <tr key={row.period} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 pr-4">{formatPeriodLabel(row.period, groupBy, locale)}</td>
                          <td className="py-2 pr-4 text-right font-medium">{formatJPY(row.totalRevenue)}</td>
                          <td className="py-2 pr-4 text-right">{row.bookingCount}</td>
                          <td className="py-2 pr-4 text-right">{row.newCustomerCount}</td>
                          <td className="py-2 text-right">{row.existingCustomerCount}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-gray-300 font-semibold">
                        <td className="py-2 pr-4">{t('total')}</td>
                        <td className="py-2 pr-4 text-right">{formatJPY(summaryTotals.totalRevenue)}</td>
                        <td className="py-2 pr-4 text-right">{summaryTotals.bookingCount}</td>
                        <td className="py-2 pr-4 text-right">{summaryTotals.newCustomerCount}</td>
                        <td className="py-2 text-right">{summaryTotals.existingCustomerCount}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Worker Rankings */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">{t('workerRankings')}</h3>
            <RankingsSection startDate={startDate} endDate={endDate} />
          </div>

          {/* Worker Performance Table */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">{t('workerPerformance')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-2 pr-4 font-medium">#</th>
                    <th className="pb-2 pr-4 font-medium">{t('workerName')}</th>
                    <th className="pb-2 pr-4 text-right font-medium">{t('revenue')}</th>
                    <th className="pb-2 pr-4 text-right font-medium">{t('bookings')}</th>
                    <th className="pb-2 text-right font-medium">{t('avgPerBooking')}</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-gray-400">
                        {t('noData')}
                      </td>
                    </tr>
                  ) : (
                    workers.map((w, i) => (
                      <tr key={w.workerId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-4 text-gray-400">{i + 1}</td>
                        <td className="py-2 pr-4 font-medium">{w.workerName}</td>
                        <td className="py-2 pr-4 text-right">{formatJPY(w.totalRevenue)}</td>
                        <td className="py-2 pr-4 text-right">{w.bookingCount}</td>
                        <td className="py-2 text-right">{formatJPY(w.averagePerBooking)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SummaryCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
    </div>
  )
}
