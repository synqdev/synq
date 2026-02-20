'use client'

/**
 * Admin Calendar Component
 *
 * Interactive calendar view for admin dashboard.
 * Shows all bookings with customer details and allows booking management.
 * Uses SWR polling for real-time updates (10 second intervals).
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TimelineCalendar } from '@/components/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useCalendarPolling } from '@/hooks/useCalendarPolling'
import type { CalendarSlot, CalendarWorker } from '@/types/calendar'
import { BookingModal, type BookingDetails, type Worker } from './booking-modal'

interface AdminCalendarProps {
  workers: Worker[]
  slots: CalendarSlot[]
  date: Date
  locale: string
}

/**
 * Format date to YYYY-MM-DD string for URL params.
 */
function formatDateParam(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Format date for display in header.
 */
function formatDisplayDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

/**
 * Admin calendar with date navigation and booking modal.
 *
 * Features:
 * - Date picker navigation
 * - Previous/next day buttons
 * - Click on booking to view/edit details
 * - Interactive mode shows all booking information
 * - Real-time updates via SWR polling (10 seconds)
 */
export function AdminCalendar({
  workers: initialWorkers,
  slots: initialSlots,
  date,
  locale,
}: AdminCalendarProps) {
  const router = useRouter()
  const [selectedBooking, setSelectedBooking] = useState<BookingDetails | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Format date for API
  const dateStr = formatDateParam(date)

  // Use SWR polling for real-time updates
  const {
    workers: polledWorkers,
    slots: polledSlots,
    isLoading,
    lastUpdated,
    refresh,
  } = useCalendarPolling({
    date: dateStr,
    mode: 'admin',
    pollingInterval: 10000, // 10 seconds
  })

  // Use polled data if available, otherwise fall back to initial server data
  const workers = polledWorkers.length > 0 ? polledWorkers : initialWorkers
  const slots = polledSlots.length > 0 || polledWorkers.length > 0 ? polledSlots : initialSlots

  // Convert workers to CalendarWorker format
  const calendarWorkers: CalendarWorker[] = workers.map((w) => ({
    id: w.id,
    name: w.name,
    nameEn: w.nameEn ?? undefined,
  }))

  // Navigate to a new date
  const navigateToDate = useCallback(
    (newDate: Date) => {
      router.push(`?date=${formatDateParam(newDate)}`)
    },
    [router]
  )

  // Go to previous day
  const goToPrevious = () => {
    const prevDate = new Date(date)
    prevDate.setDate(prevDate.getDate() - 1)
    navigateToDate(prevDate)
  }

  // Go to next day
  const goToNext = () => {
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)
    navigateToDate(nextDate)
  }

  // Go to today
  const goToToday = () => {
    navigateToDate(new Date())
  }

  // Handle date input change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value + 'T00:00:00')
    if (!isNaN(newDate.getTime())) {
      navigateToDate(newDate)
    }
  }

  // Handle slot click - open modal if slot has booking
  const handleSlotSelect = (slot: CalendarSlot) => {
    if (slot.booking) {
      const bookingDetails: BookingDetails = {
        id: slot.booking.id,
        startsAt: slot.booking.startsAt,
        endsAt: slot.booking.endsAt,
        workerId: slot.booking.workerId,
        resourceId: slot.booking.resourceId,
        customerName: slot.booking.customerName || '',
        serviceName: slot.booking.serviceName || '',
        status: slot.booking.status,
      }
      setSelectedBooking(bookingDetails)
      setIsModalOpen(true)
    }
  }

  // Close modal and refresh data
  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedBooking(null)
    // Trigger SWR refresh for immediate update
    refresh()
  }

  // Format last updated time
  const lastUpdatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null

  // Count bookings for today
  const bookingCount = slots.filter((s) => s.booking).length

  return (
    <div className="space-y-4">
      {/* Date navigation header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevious}>
            {locale === 'ja' ? '前日' : 'Previous'}
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            {locale === 'ja' ? '今日' : 'Today'}
          </Button>
          <Button variant="outline" size="sm" onClick={goToNext}>
            {locale === 'ja' ? '翌日' : 'Next'}
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Input
            type="date"
            value={formatDateParam(date)}
            onChange={handleDateChange}
            className="w-40"
          />
          <span className="text-sm text-gray-600">
            {bookingCount} {locale === 'ja' ? '件の予約' : 'bookings'}
          </span>
          {isLoading && <Spinner size="sm" />}
        </div>
      </div>

      {/* Last updated indicator */}
      {lastUpdatedStr && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          {locale === 'ja' ? '最終更新: ' : 'Last updated: '}
          {lastUpdatedStr}
        </div>
      )}

      {/* Date display */}
      <div className="text-lg font-medium text-gray-900">
        {formatDisplayDate(date, locale)}
      </div>

      {/* Calendar */}
      <TimelineCalendar
        date={date}
        workers={calendarWorkers}
        slots={slots}
        mode="interactive"
        onSlotSelect={handleSlotSelect}
        timeRange={{ start: '09:00', end: '19:00' }}
        className="min-h-[400px]"
      />

      {/* Booking Modal */}
      <BookingModal
        booking={selectedBooking}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        workers={workers}
        locale={locale}
      />
    </div>
  )
}
