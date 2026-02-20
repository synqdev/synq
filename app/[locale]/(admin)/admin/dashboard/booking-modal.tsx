'use client'

/**
 * Booking Modal Component
 *
 * Admin modal for viewing, editing, and canceling bookings.
 * Provides full booking management within the dashboard calendar view.
 */

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cancelBooking, updateBooking } from '@/app/actions/admin-booking'

export interface BookingDetails {
  id: string
  startsAt: Date
  endsAt: Date
  workerId: string
  resourceId: string
  customerName: string
  customerEmail?: string
  serviceName: string
  status: 'CONFIRMED' | 'CANCELLED' | 'NOSHOW'
}

export interface Worker {
  id: string
  name: string
  nameEn?: string | null
}

interface BookingModalProps {
  booking: BookingDetails | null
  isOpen: boolean
  onClose: () => void
  workers: Worker[]
  locale: string
}

/**
 * Modal for viewing and managing booking details.
 *
 * Features:
 * - View booking information (read-only)
 * - Edit booking (change time, worker)
 * - Cancel booking with confirmation
 */
export function BookingModal({
  booking,
  isOpen,
  onClose,
  workers,
  locale,
}: BookingModalProps) {
  const [isPending, startTransition] = useTransition()
  const [mode, setMode] = useState<'view' | 'edit' | 'cancel'>('view')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !booking) return null

  const handleCancel = () => {
    startTransition(async () => {
      try {
        await cancelBooking(booking.id)
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to cancel booking')
      }
    })
  }

  const handleUpdate = (formData: FormData) => {
    startTransition(async () => {
      try {
        formData.set('bookingId', booking.id)
        await updateBooking(formData)
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update booking')
      }
    })
  }

  const toLocalInputValue = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const statusLabels = {
    CONFIRMED: locale === 'ja' ? '確定' : 'Confirmed',
    CANCELLED: locale === 'ja' ? 'キャンセル' : 'Cancelled',
    NOSHOW: locale === 'ja' ? '無断欠席' : 'No Show',
  }

  const statusColors = {
    CONFIRMED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    NOSHOW: 'bg-yellow-100 text-yellow-800',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-secondary-900">
            {locale === 'ja' ? '予約詳細' : 'Booking Details'}
          </h2>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-600"
            aria-label={locale === 'ja' ? '閉じる' : 'Close'}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* View Mode */}
        {mode === 'view' && (
          <div className="space-y-4">
            <div>
              <span
                className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${statusColors[booking.status]}`}
              >
                {statusLabels[booking.status]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-secondary-500">
                  {locale === 'ja' ? 'お客様' : 'Customer'}
                </p>
                <p className="text-secondary-900">{booking.customerName}</p>
                {booking.customerEmail && (
                  <p className="text-secondary-500">{booking.customerEmail}</p>
                )}
              </div>
              <div>
                <p className="font-medium text-secondary-500">
                  {locale === 'ja' ? 'サービス' : 'Service'}
                </p>
                <p className="text-secondary-900">{booking.serviceName}</p>
              </div>
              <div>
                <p className="font-medium text-secondary-500">
                  {locale === 'ja' ? '日付' : 'Date'}
                </p>
                <p className="text-secondary-900">{formatDate(booking.startsAt)}</p>
              </div>
              <div>
                <p className="font-medium text-secondary-500">
                  {locale === 'ja' ? '時間' : 'Time'}
                </p>
                <p className="text-secondary-900">
                  {formatTime(booking.startsAt)} - {formatTime(booking.endsAt)}
                </p>
              </div>
              <div>
                <p className="font-medium text-secondary-500">
                  {locale === 'ja' ? '担当' : 'Worker'}
                </p>
                <p className="text-secondary-900">
                  {workers.find((w) => w.id === booking.workerId)?.name || '-'}
                </p>
              </div>
            </div>

            {/* Actions */}
            {booking.status === 'CONFIRMED' && (
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode('edit')}
                  className="flex-1"
                >
                  {locale === 'ja' ? '編集' : 'Edit'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode('cancel')}
                  className="flex-1 text-red-600 hover:bg-red-50"
                >
                  {locale === 'ja' ? 'キャンセル' : 'Cancel'}
                </Button>
              </div>
            )}

            <div className="pt-2">
              <Button variant="secondary" size="sm" onClick={onClose} className="w-full">
                {locale === 'ja' ? '閉じる' : 'Close'}
              </Button>
            </div>
          </div>
        )}

        {/* Edit Mode */}
        {mode === 'edit' && (
          <form action={handleUpdate} className="space-y-4">
            <Input
              type="datetime-local"
              name="startsAt"
              label={locale === 'ja' ? '開始日時' : 'Start Time'}
              defaultValue={toLocalInputValue(new Date(booking.startsAt))}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-secondary-700">
                {locale === 'ja' ? '担当者' : 'Worker'}
              </label>
              <select
                name="workerId"
                defaultValue={booking.workerId}
                className="w-full rounded-lg border border-secondary-300 px-4 py-2 text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name}
                    {worker.nameEn && ` (${worker.nameEn})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-secondary-700">
                {locale === 'ja' ? 'ステータス' : 'Status'}
              </label>
              <select
                name="status"
                defaultValue={booking.status}
                className="w-full rounded-lg border border-secondary-300 px-4 py-2 text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="CONFIRMED">{statusLabels.CONFIRMED}</option>
                <option value="CANCELLED">{statusLabels.CANCELLED}</option>
                <option value="NOSHOW">{statusLabels.NOSHOW}</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" loading={isPending} className="flex-1">
                {locale === 'ja' ? '保存' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode('view')}
                className="flex-1"
              >
                {locale === 'ja' ? '戻る' : 'Back'}
              </Button>
            </div>
          </form>
        )}

        {/* Cancel Confirmation Mode */}
        {mode === 'cancel' && (
          <div className="space-y-4">
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">
                {locale === 'ja'
                  ? 'この予約をキャンセルしてもよろしいですか？この操作は取り消せません。'
                  : 'Are you sure you want to cancel this booking? This action cannot be undone.'}
              </p>
            </div>

            <div className="text-sm text-secondary-600">
              <p>
                <strong>{booking.customerName}</strong>
              </p>
              <p>
                {formatDate(booking.startsAt)} {formatTime(booking.startsAt)}
              </p>
              <p>{booking.serviceName}</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={handleCancel}
                loading={isPending}
                className="flex-1 bg-red-600 text-white hover:bg-red-700"
              >
                {locale === 'ja' ? 'キャンセル確定' : 'Confirm Cancel'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setMode('view')}
                disabled={isPending}
                className="flex-1"
              >
                {locale === 'ja' ? '戻る' : 'Back'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
