'use client'

/**
 * Admin Dashboard Client Component
 *
 * Interactive wrapper for EmployeeTimeline in admin mode.
 * Handles booking cancellation and real-time updates via SWR.
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { EmployeeTimeline } from '@/components/calendar/employee-timeline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useCalendarPolling } from '@/hooks/useCalendarPolling'
import { mapAdminBookingsToCalendar } from '@/lib/mappers/calendar'
import { cancelBooking } from '@/app/actions/admin-booking'
import type { TimelineWorker, TimelineSlot } from '@/components/calendar/employee-timeline'

interface AdminDashboardClientProps {
  initialWorkers: TimelineWorker[]
  date: Date
  locale: string
}

/**
 * Format date to YYYY-MM-DD string for URL params.
 * Uses local date to avoid timezone shifting near midnight.
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
 * Admin dashboard client with date navigation and booking cancellation.
 *
 * Features:
 * - Date picker navigation
 * - Previous/next day buttons
 * - Click X button on bookings to cancel
 * - Real-time updates via SWR polling (10 seconds)
 */
export function AdminDashboardClient({
  initialWorkers,
  date,
  locale,
}: AdminDashboardClientProps) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

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

  // Transform polled data to timeline format
  const polledTimelineWorkers =
    polledWorkers.length > 0
      ? mapAdminBookingsToCalendar(
          polledWorkers,
          polledSlots
            .filter((s) => s.booking)
            .map((s) => ({
              id: s.booking!.id,
              workerId: s.booking!.workerId,
              startsAt: s.booking!.startsAt,
              endsAt: s.booking!.endsAt,
              customerName: s.booking!.customerName || 'Unknown',
              status: s.booking!.status,
            }))
        )
      : []

  // Use polled data once SWR has completed at least one fetch (lastUpdated is set),
  // otherwise fall back to initial server data. This correctly handles empty results.
  const workers = lastUpdated !== null ? polledTimelineWorkers : initialWorkers

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

  // Handle booking cancellation
  const handleSlotRemove = async (slot: TimelineSlot, workerId: string) => {
    const bookingId = slot.data?.bookingId
    if (!bookingId) return

    if (!confirm(locale === 'ja' ? '予約をキャンセルしますか？' : 'Cancel this booking?')) {
      return
    }

    setIsProcessing(true)
    try {
      await cancelBooking(bookingId)
      // Trigger SWR refresh for immediate update
      refresh()
    } catch (error) {
      console.error('Failed to cancel booking:', error)
      alert(locale === 'ja' ? 'キャンセルに失敗しました' : 'Failed to cancel booking')
    } finally {
      setIsProcessing(false)
    }
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
  const bookingCount = workers.reduce((total, worker) => {
    return total + worker.slots.filter((s) => s.type === 'booked').length
  }, 0)

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
          {(isLoading || isProcessing) && <Spinner size="sm" />}
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

      {/* Employee Timeline */}
      <EmployeeTimeline
        workers={workers}
        mode="admin"
        timeRange={{ start: '10:00', end: '19:00' }}
        onEventRemove={handleSlotRemove}
        className="min-h-[400px]"
      />
    </div>
  )
}
