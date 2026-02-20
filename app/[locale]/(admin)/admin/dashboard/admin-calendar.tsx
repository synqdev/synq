'use client'

/**
 * Admin Calendar Component
 *
 * Interactive calendar view for admin dashboard.
 * Shows all bookings with customer details and allows booking management.
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TimelineCalendar } from '@/components/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CalendarSlot, CalendarWorker } from '@/types/calendar'
import { BookingModal, type BookingDetails, type Worker } from './booking-modal'

interface AdminCalendarProps {
  workers: Worker[]
  slots: CalendarSlot[]
  date: Date
  locale: string
}

/**
 * Format date to YYYY-MM-DD string for URL params using local date parts.
 * Avoids UTC conversion that can shift the day in positive-offset timezones.
 */
function formatDateParam(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
 */
export function AdminCalendar({
  workers,
  slots,
  date,
  locale,
}: AdminCalendarProps) {
  const router = useRouter()
  const [selectedBooking, setSelectedBooking] = useState<BookingDetails | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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
        customerEmail: slot.booking.customerEmail || undefined,
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
    // Refresh the page to get updated booking data
    router.refresh()
  }

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
        </div>
      </div>

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
