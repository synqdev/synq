'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { RankingsSection } from './rankings-section'
import { ExportButtons } from './export-buttons'

import { DataTable, type DataTableColumn } from '@/components/ui/data-table'

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
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(amount)
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
      // Use Monday as week start (Japanese business convention)
      const dayOfWeek = (today.getDay() + 6) % 7 // 0=Mon, 1=Tue, ..., 6=Sun
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
    retention: {
      totalCustomers: number
      repeatCustomers: number
      repeatRate: number
      newCustomers: number
    }
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

  const revenueColumns = useMemo<DataTableColumn<RevenuePeriod>[]>(
    () => [
      {
        key: 'period',
        header: t('period'),
        cell: (row) => formatPeriodLabel(row.period, groupBy, locale),
        align: 'left',
        widthClassName: 'min-w-[160px]',
      },
      {
        key: 'totalRevenue',
        header: t('revenue'),
        cell: (row) => formatJPY(row.totalRevenue),
        align: 'right',
        widthClassName: 'min-w-[120px]',
      },
      {
        key: 'bookingCount',
        header: t('bookings'),
        cell: (row) => String(row.bookingCount),
        align: 'right',
        widthClassName: 'min-w-[100px]',
      },
      {
        key: 'newCustomerCount',
        header: t('newCustomers'),
        cell: (row) => String(row.newCustomerCount),
        align: 'right',
        widthClassName: 'min-w-[120px]',
      },
      {
        key: 'existingCustomerCount',
        header: t('existingCustomers'),
        cell: (row) => String(row.existingCustomerCount),
        align: 'right',
        widthClassName: 'min-w-[140px]',
      },
    ],
    [groupBy, locale, t]
  )

  const workersWithRank = useMemo(
    () => workers.map((w, i) => ({ ...w, rank: i + 1 })),
    [workers]
  )

  type WorkerMetricWithRank = WorkerMetric & { rank: number }

  const workerColumns = useMemo<DataTableColumn<WorkerMetricWithRank>[]>(
    () => [
      {
        key: 'rank',
        header: '#',
        cell: (row) => String(row.rank),
        align: 'center',
        widthClassName: 'min-w-[60px]',
      },
      {
        key: 'workerName',
        header: t('workerName'),
        cell: (row) => row.workerName,
        align: 'left',
        widthClassName: 'min-w-[160px]',
      },
      {
        key: 'totalRevenue',
        header: t('revenue'),
        cell: (row) => formatJPY(row.totalRevenue),
        align: 'right',
        widthClassName: 'min-w-[120px]',
      },
      {
        key: 'bookingCount',
        header: t('bookings'),
        cell: (row) => String(row.bookingCount),
        align: 'right',
        widthClassName: 'min-w-[100px]',
      },
      {
        key: 'averagePerBooking',
        header: t('avgPerBooking'),
        cell: (row) => formatJPY(row.averagePerBooking),
        align: 'right',
        widthClassName: 'min-w-[140px]',
      },
    ],
    [t]
  )

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
        <ExportButtons startDate={startDate} endDate={endDate} groupBy={groupBy} />
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
              value={`${retentionData?.retention?.repeatRate ?? 0}%`}
              subtitle={retentionData?.retention ? `${retentionData.retention.repeatCustomers} / ${retentionData.retention.totalCustomers}` : undefined}
            />
          </div>

          {/* Revenue Table */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">{t('revenueBreakdown')}</h3>
            {summary.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">{t('noData')}</p>
            ) : (
              <>
                <DataTable data={summary} columns={revenueColumns} striped />
                <div className="grid grid-cols-5 border-t-2 border-gray-300 bg-white px-4 py-2 text-sm font-semibold">
                  <div>{t('total')}</div>
                  <div className="text-right">{formatJPY(summaryTotals.totalRevenue)}</div>
                  <div className="text-right">{summaryTotals.bookingCount}</div>
                  <div className="text-right">{summaryTotals.newCustomerCount}</div>
                  <div className="text-right">{summaryTotals.existingCustomerCount}</div>
                </div>
              </>
            )}
          </div>

          {/* Worker Rankings */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">{t('workerRankings')}</h3>
            <RankingsSection startDate={startDate} endDate={endDate} />
          </div>

          {/* Worker Performance Table */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">{t('workerPerformance')}</h3>
            {workers.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">{t('noData')}</p>
            ) : (
              <DataTable data={workersWithRank} columns={workerColumns} striped />
            )}
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
