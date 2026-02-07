'use client'

/**
 * Booking Side Panel Component
 *
 * Slide-in panel for viewing, editing, and canceling bookings.
 * Uses CSS transitions instead of floating modal for better UX.
 * Provides full booking management within the dashboard calendar view.
 */

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cancelBooking, updateBooking } from '@/app/actions/admin-booking'
import { getLocaleDateTag, getLocalizedName } from '@/lib/i18n/locale'

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
 * Side panel for viewing and managing booking details.
 *
 * Features:
 * - Slides in from right with CSS transitions
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
  const tBookingModal = useTranslations('admin.bookingModal')
  const tBooking = useTranslations('booking')
  const tCommon = useTranslations('common')
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
        setError(err instanceof Error ? err.message : tBookingModal('cancelError'))
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
        setError(err instanceof Error ? err.message : tBookingModal('updateError'))
      }
    })
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString(getLocaleDateTag(locale), {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(getLocaleDateTag(locale), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const statusLabels = {
    CONFIRMED: tBooking('confirmed'),
    CANCELLED: tBooking('cancelled'),
    NOSHOW: tBooking('noShow'),
  }

  const statusColors = {
    CONFIRMED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    NOSHOW: 'bg-yellow-100 text-yellow-800',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Side Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-secondary-900">
            {tBookingModal('title')}
          </h2>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-600"
            aria-label={tBookingModal('close')}
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
                  {tBookingModal('customer')}
                </p>
                <p className="text-secondary-900">{booking.customerName}</p>
                {booking.customerEmail && (
                  <p className="text-secondary-500">{booking.customerEmail}</p>
                )}
              </div>
              <div>
                <p className="font-medium text-secondary-500">
                  {tBookingModal('service')}
                </p>
                <p className="text-secondary-900">{booking.serviceName}</p>
              </div>
              <div>
                <p className="font-medium text-secondary-500">
                  {tBookingModal('date')}
                </p>
                <p className="text-secondary-900">{formatDate(booking.startsAt)}</p>
              </div>
              <div>
                <p className="font-medium text-secondary-500">
                  {tBookingModal('time')}
                </p>
                <p className="text-secondary-900">
                  {formatTime(booking.startsAt)} - {formatTime(booking.endsAt)}
                </p>
              </div>
              <div>
                <p className="font-medium text-secondary-500">
                  {tBookingModal('worker')}
                </p>
                <p className="text-secondary-900">
                  {(() => {
                    const worker = workers.find((w) => w.id === booking.workerId)
                    return worker ? getLocalizedName(locale, worker.name, worker.nameEn) : '-'
                  })()}
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
                  {tBookingModal('edit')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode('cancel')}
                  className="flex-1 text-red-600 hover:bg-red-50"
                >
                  {tBookingModal('cancel')}
                </Button>
              </div>
            )}

            <div className="pt-2">
              <Button variant="secondary" size="sm" onClick={onClose} className="w-full">
                {tBookingModal('close')}
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
              label={tBookingModal('startTime')}
              defaultValue={new Date(booking.startsAt).toISOString().slice(0, 16)}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-secondary-700">
                {tBookingModal('worker')}
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
                {tBookingModal('status')}
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
                {tCommon('save')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode('view')}
                className="flex-1"
              >
                {tCommon('back')}
              </Button>
            </div>
          </form>
        )}

        {/* Cancel Confirmation Mode */}
        {mode === 'cancel' && (
          <div className="space-y-4">
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">
                {tBookingModal('confirmCancelMessage')}
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
                {tBookingModal('confirmCancelAction')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setMode('view')}
                disabled={isPending}
                className="flex-1"
              >
                {tCommon('back')}
              </Button>
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  )
}
