'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { useChatContext } from '@/components/chat'
import { IntakeUpload } from './intake-upload'

interface WorkerOption {
  id: string
  name: string
}

interface BookingItem {
  id: string
  startsAt: string
  endsAt: string
  status: string
  serviceName: string
  servicePrice: number
  workerName: string
  resourceName: string
}

interface CustomerDetailData {
  id: string
  name: string
  email: string
  phone: string | null
  locale: string
  notes: string | null
  ticketBalance: number
  outstandingAmount: number
  assignedStaff: { id: string; name: string } | null
  visitCount: number
  lastVisitDate: string | null
  nextBookingDate: string | null
  createdAt: string
  updatedAt: string
  bookings: BookingItem[]
}

interface CustomerDetailProps {
  customerId: string
  locale: string
  workers: WorkerOption[]
}

const fetcher = async (url: string): Promise<CustomerDetailData> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch customer')
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

function formatDateTime(value: string, locale: string) {
  const d = new Date(value)
  const date = d.toLocaleDateString(getLocaleTag(locale), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const time = d.toLocaleTimeString(getLocaleTag(locale), {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date} ${time}`
}

function formatYen(value: number) {
  return `¥${value.toLocaleString('ja-JP')}`
}

const statusStyles: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800 line-through',
  NOSHOW: 'bg-orange-100 text-orange-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
}

export function CustomerDetail({ customerId, locale, workers }: CustomerDetailProps) {
  const t = useTranslations('admin.customerDetail')
  const tCommon = useTranslations('common')

  const { data: customer, error, isLoading, mutate } = useSWR<CustomerDetailData>(
    `/api/admin/customers/${customerId}`,
    fetcher
  )

  const [notes, setNotes] = useState('')
  const [notesChanged, setNotesChanged] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const latestNotesRef = useRef(notes)

  useEffect(() => {
    latestNotesRef.current = notes
  }, [notes])

  useEffect(() => {
    if (customer) {
      setNotes(customer.notes ?? '')
      setNotesChanged(false)
    }
  }, [customer])

  const handleNotesChange = (value: string) => {
    setNotes(value)
    setNotesChanged(true)
    setSaveMessage(null)
  }

  const handleSaveNotes = useCallback(async () => {
    const savedNotes = latestNotesRef.current
    setSaving(true)
    setSaveMessage(null)
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: savedNotes }),
      })
      if (!res.ok) throw new Error('Save failed')
      // Only clear notesChanged if the notes haven't been modified since save started
      if (latestNotesRef.current === savedNotes) {
        setNotesChanged(false)
      }
      setSaveMessage(t('saved'))
      mutate()
    } catch {
      setSaveMessage(t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }, [customerId, t, mutate])

  const handleStaffChange = useCallback(async (staffId: string) => {
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedStaffId: staffId || null }),
      })
      if (!res.ok) throw new Error('Save failed')
      mutate()
    } catch {
      // silent fail
    }
  }, [customerId, mutate])

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Spinner size="lg" className="text-primary-500" />
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="py-8 text-center">
        <p className="text-error-600">{t('notFound')}</p>
        <Link
          href={`/${locale}/admin/customers`}
          className="mt-4 inline-block text-primary-600 hover:underline"
        >
          {t('backToList')}
        </Link>
      </div>
    )
  }

  const { setCustomerId, setIsOpen } = useChatContext()

  const handleAskAi = useCallback(() => {
    setCustomerId(customer.id)
    setIsOpen(true)
  }, [customer.id, setCustomerId, setIsOpen])

  const staffOptions = [
    { value: '', label: t('noStaff') },
    ...workers.map((w) => ({ value: w.id, label: w.name })),
  ]

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/admin/customers`}
        className="inline-block text-sm text-primary-600 hover:underline"
      >
        &larr; {t('backToList')}
      </Link>

      {/* Customer Info */}
      <section className="rounded-lg border border-secondary-200 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-secondary-900">{customer.name}</h2>
          <Button variant="outline" size="sm" onClick={handleAskAi}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="mr-1.5 h-4 w-4"
            >
              <path d="M10 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 1ZM5.05 3.05a.75.75 0 0 1 1.06 0l1.062 1.06A.75.75 0 1 1 6.11 5.173L5.05 4.11a.75.75 0 0 1 0-1.06ZM14.95 3.05a.75.75 0 0 1 0 1.06l-1.06 1.062a.75.75 0 0 1-1.062-1.061l1.061-1.06a.75.75 0 0 1 1.06 0ZM3 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 3 8ZM14 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 14 8ZM7.172 13.828a.75.75 0 0 1 0 1.061l-1.06 1.06a.75.75 0 0 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM12.828 13.828a.75.75 0 0 1 1.061 0l1.06 1.06a.75.75 0 0 1-1.06 1.061l-1.06-1.06a.75.75 0 0 1 0-1.061ZM10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9.25 14a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 0 1.5H10a.75.75 0 0 1-.75-.75Z" />
            </svg>
            {t('askAi')}
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <span className="text-sm text-secondary-500">{tCommon('email')}</span>
            <p className="font-medium">{customer.email}</p>
          </div>
          <div>
            <span className="text-sm text-secondary-500">{tCommon('phone')}</span>
            <p className="font-medium">{customer.phone || '-'}</p>
          </div>
          <div>
            <span className="text-sm text-secondary-500">{t('registeredAt')}</span>
            <p className="font-medium">{formatDate(customer.createdAt, locale)}</p>
          </div>
          <div>
            <span className="text-sm text-secondary-500">{t('visitCount')}</span>
            <p className="font-medium">{customer.visitCount}</p>
          </div>
          <div>
            <span className="text-sm text-secondary-500">{t('lastVisit')}</span>
            <p className="font-medium">{formatDate(customer.lastVisitDate, locale)}</p>
          </div>
          <div>
            <span className="text-sm text-secondary-500">{t('nextBooking')}</span>
            <p className="font-medium">{formatDate(customer.nextBookingDate, locale)}</p>
          </div>
          {customer.outstandingAmount > 0 && (
            <div>
              <span className="text-sm text-secondary-500">{t('outstandingAmount')}</span>
              <p className="font-medium text-red-600">{formatYen(customer.outstandingAmount)}</p>
            </div>
          )}
        </div>

        <div className="mt-4 max-w-xs">
          <span className="mb-1 block text-sm text-secondary-500">{t('assignedStaff')}</span>
          <Select
            options={staffOptions}
            value={customer.assignedStaff?.id ?? ''}
            onChange={handleStaffChange}
          />
        </div>
      </section>

      {/* Notes */}
      <section className="rounded-lg border border-secondary-200 p-4">
        <h3 className="mb-3 text-lg font-semibold text-secondary-900">{t('notes')}</h3>
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          rows={4}
          maxLength={5000}
          disabled={saving}
          className="w-full rounded-lg border border-secondary-300 px-4 py-2 text-secondary-900 placeholder:text-secondary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={t('notesPlaceholder')}
        />
        <div className="mt-2 flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleSaveNotes}
            loading={saving}
            disabled={!notesChanged || saving}
          >
            {tCommon('save')}
          </Button>
          {saveMessage && (
            <span className={`text-sm ${saveMessage === t('saved') ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage}
            </span>
          )}
        </div>
      </section>

      {/* Booking History */}
      <section className="rounded-lg border border-secondary-200 p-4">
        <h3 className="mb-3 text-lg font-semibold text-secondary-900">{t('bookingHistory')}</h3>
        {customer.bookings.length === 0 ? (
          <p className="py-4 text-center text-secondary-500">{t('noBookings')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-secondary-200 bg-secondary-50">
                  <th className="px-3 py-2 text-left font-medium text-secondary-700">{tCommon('date')}</th>
                  <th className="px-3 py-2 text-left font-medium text-secondary-700">{t('time')}</th>
                  <th className="px-3 py-2 text-left font-medium text-secondary-700">{t('service')}</th>
                  <th className="px-3 py-2 text-left font-medium text-secondary-700">{t('worker')}</th>
                  <th className="px-3 py-2 text-left font-medium text-secondary-700">{tCommon('status')}</th>
                  <th className="px-3 py-2 text-right font-medium text-secondary-700">{t('price')}</th>
                </tr>
              </thead>
              <tbody>
                {customer.bookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-secondary-100 last:border-b-0">
                    <td className="px-3 py-2">{formatDate(booking.startsAt, locale)}</td>
                    <td className="px-3 py-2">
                      {new Date(booking.startsAt).toLocaleTimeString(getLocaleTag(locale), {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-2">{booking.serviceName}</td>
                    <td className="px-3 py-2">{booking.workerName}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[booking.status] ?? 'bg-gray-100 text-gray-800'}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">{formatYen(booking.servicePrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Medical Records / Intake Forms */}
      <section className="rounded-lg border border-secondary-200 p-4">
        <h3 className="mb-3 text-lg font-semibold text-secondary-900">{t('medicalRecords')}</h3>
        <IntakeUpload customerId={customerId} locale={locale} />
      </section>
    </div>
  )
}
