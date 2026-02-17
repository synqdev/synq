'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'

interface WorkerOption {
  id: string
  name: string
}

interface CustomerListItem {
  id: string
  name: string
  email: string
  phone: string | null
  assignedStaffName: string | null
  visitCount: number
  lastVisitDate: string | null
  nextBookingDate: string | null
  createdAt: string
  outstandingAmount: number
}

interface CustomerListResponse {
  customers: CustomerListItem[]
  total: number
  page: number
  pageSize: number
}

interface CustomerListProps {
  locale: string
  workers: WorkerOption[]
}

const fetcher = async (url: string): Promise<CustomerListResponse> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch customers')
  }
  return response.json()
}

function getLocaleTag(locale: string) {
  return locale === 'ja' ? 'ja-JP' : 'en-US'
}

function formatDate(value: string | null, locale: string) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString(getLocaleTag(locale), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatYen(value: number) {
  return `¥${value.toLocaleString('ja-JP')}`
}

export function CustomerList({ locale, workers }: CustomerListProps) {
  const t = useTranslations('admin.customersPage')
  const tCommon = useTranslations('common')

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [assignedStaffId, setAssignedStaffId] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, assignedStaffId])

  const queryString = useMemo(() => {
    const query = new URLSearchParams()
    if (debouncedSearch) query.set('search', debouncedSearch)
    if (assignedStaffId) query.set('assignedStaffId', assignedStaffId)
    query.set('page', String(page))
    query.set('pageSize', '25')
    query.set('sortBy', 'createdAt')
    query.set('sortOrder', 'desc')
    return query.toString()
  }, [assignedStaffId, debouncedSearch, page])

  const { data, error, isLoading } = useSWR<CustomerListResponse>(
    `/api/admin/customers?${queryString}`,
    fetcher,
    {
      keepPreviousData: true,
    }
  )

  const customers = data?.customers ?? []
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? 25
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const staffOptions = useMemo(
    () => [
      { value: '', label: t('allStaff') },
      ...workers.map((worker) => ({ value: worker.id, label: worker.name })),
    ],
    [t, workers]
  )

  const columns = useMemo<DataTableColumn<CustomerListItem>[]>(
    () => [
      {
        key: 'name',
        header: tCommon('name'),
        sortable: true,
        sortValue: (row) => row.name,
        align: 'left',
        widthClassName: 'min-w-[180px]',
        cell: (row) => (
          <Link
            href={`/${locale}/admin/customers/${row.id}`}
            className="text-primary-600 hover:text-primary-700 hover:underline"
          >
            {row.name}
          </Link>
        ),
      },
      {
        key: 'email',
        header: tCommon('email'),
        sortable: true,
        sortValue: (row) => row.email,
        align: 'left',
        widthClassName: 'min-w-[220px]',
        cell: (row) => row.email,
      },
      {
        key: 'phone',
        header: tCommon('phone'),
        sortable: true,
        sortValue: (row) => row.phone ?? '',
        align: 'left',
        widthClassName: 'min-w-[150px]',
        cell: (row) => row.phone || '-',
      },
      {
        key: 'assignedStaffName',
        header: t('assignedStaff'),
        sortable: true,
        sortValue: (row) => row.assignedStaffName ?? '',
        align: 'left',
        widthClassName: 'min-w-[140px]',
        cell: (row) => row.assignedStaffName || '-',
      },
      {
        key: 'visitCount',
        header: t('visitCount'),
        sortable: true,
        sortValue: (row) => row.visitCount,
        align: 'right',
        widthClassName: 'min-w-[110px]',
        cell: (row) => row.visitCount,
      },
      {
        key: 'lastVisitDate',
        header: t('lastVisit'),
        sortable: true,
        sortValue: (row) => (row.lastVisitDate ? new Date(row.lastVisitDate).getTime() : null),
        align: 'left',
        widthClassName: 'min-w-[140px]',
        cell: (row) => formatDate(row.lastVisitDate, locale),
      },
      {
        key: 'createdAt',
        header: t('registeredAt'),
        sortable: true,
        sortValue: (row) => new Date(row.createdAt).getTime(),
        align: 'left',
        widthClassName: 'min-w-[140px]',
        cell: (row) => formatDate(row.createdAt, locale),
      },
      {
        key: 'outstandingAmount',
        header: t('outstandingAmount'),
        sortable: true,
        sortValue: (row) => row.outstandingAmount,
        align: 'right',
        widthClassName: 'min-w-[140px]',
        cell: (row) => formatYen(row.outstandingAmount),
      },
    ],
    [locale, t, tCommon]
  )

  if (isLoading && !data) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Spinner size="lg" className="text-primary-500" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="py-8 text-center text-error-600">
        {tCommon('error')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_260px]">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('searchPlaceholder')}
        />
        <Select
          value={assignedStaffId}
          onChange={setAssignedStaffId}
          options={staffOptions}
          placeholder={t('assignedStaff')}
        />
      </div>

      {customers.length === 0 ? (
        <p className="py-8 text-center text-secondary-500">{t('noCustomers')}</p>
      ) : (
        <>
          <DataTable
            data={customers}
            columns={columns}
            caption={t('title')}
            defaultSort={{ key: 'createdAt', direction: 'desc' }}
            className="border-secondary-200"
          />

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-secondary-600">
              {t('pageStatus', { page, totalPages, total })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1 || isLoading}
              >
                {t('previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || isLoading}
              >
                {t('next')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
