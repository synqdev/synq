'use client'

/**
 * Admin Dashboard Client Component
 *
 * Interactive wrapper for EmployeeTimeline in admin mode.
 * Handles booking cancellation, blocking, and real-time updates via SWR.
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useFormatter } from 'next-intl'
import { EmployeeTimeline } from '@/components/calendar/employee-timeline'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Spinner } from '@/components/ui/spinner'
import { useCalendarPolling } from '@/hooks/useCalendarPolling'
import { mapAdminBookingsToCalendar } from '@/lib/mappers/calendar'
import { cancelBooking, blockWorkerTime } from '@/app/actions/admin-booking'
import type { TimelineWorker, TimelineSlot } from '@/components/calendar/employee-timeline'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface AdminDashboardClientProps {
  initialWorkers: TimelineWorker[]
  date: Date
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
 * Admin dashboard client with date navigation, booking cancellation, and blocking.
 */
export function AdminDashboardClient({
  initialWorkers,
  date,
}: AdminDashboardClientProps) {
  const router = useRouter()
  const t = useTranslations('admin.dashboardPage')
  const tCommon = useTranslations('common')
  const format = useFormatter()
  const [isProcessing, setIsProcessing] = useState(false)

  // Selection state for blocking
  const [selectedSlot, setSelectedSlot] = useState<TimelineSlot | null>(null)
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)

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
            serviceId: s.booking!.serviceId || '',
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

    if (!confirm(t('confirmCancel'))) {
      return
    }

    setIsProcessing(true)
    try {
      await cancelBooking(bookingId)
      // Trigger SWR refresh for immediate update
      refresh()
    } catch (error) {
      console.error('Failed to cancel booking:', error)
      alert(t('cancelFailed'))
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle slot selection (memoized)
  const handleSlotSelect = useCallback((slot: TimelineSlot, workerId: string) => {
    setSelectedSlot(slot)
    setSelectedWorkerId(workerId)
  }, [])

  // Handle blocking time
  const handleBlockTime = async (durationMinutes: number = 60) => {
    if (!selectedSlot || !selectedWorkerId) {
      alert(t('selectSlotFirst'))
      return
    }

    setIsProcessing(true)
    try {
      console.log('Blocking time with:', { selectedWorkerId, dateStr, startTime: selectedSlot.startTime })
      const formData = new FormData()
      formData.append('workerId', selectedWorkerId)
      formData.append('date', dateStr)
      formData.append('startTime', selectedSlot.startTime)

      // Calculate end time
      const [hours, minutes] = selectedSlot.startTime.split(':').map(Number)
      const startTotalMins = hours * 60 + minutes
      const endTotalMins = startTotalMins + durationMinutes
      const endHours = Math.floor(endTotalMins / 60)
      const endMinutes = endTotalMins % 60
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`

      formData.append('endTime', endTime)

      await blockWorkerTime(formData)
      refresh()

      // Reset selection
      setSelectedSlot(null)
      setSelectedWorkerId(null)
    } catch (error) {
      console.error('Failed to block time:', error)
      alert(t('blockFailed'))
    } finally {
      setIsProcessing(false)
    }
  }

  // Format last updated time
  const lastUpdatedStr = lastUpdated
    ? format.dateTime(lastUpdated, {
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
    <div className="space-y-4" data-testid="admin-dashboard-client">
      {/* Date navigation header */}
      {/* Date navigation header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="iso"
            size="sm"
            onClick={goToPrevious}
            className="h-[42px]"
            data-testid="admin-date-previous"
          >
            {t('previous')}
          </Button>
          <Button
            variant="iso"
            size="sm"
            onClick={goToToday}
            className="h-[42px]"
            data-testid="admin-date-today"
          >
            {t('today')}
          </Button>
          <Button
            variant="iso"
            size="sm"
            onClick={goToNext}
            className="h-[42px]"
            data-testid="admin-date-next"
          >
            {t('next')}
          </Button>
          <DatePicker
            value={formatDateParam(date)}
            onChange={handleDateChange}
            className="w-40 ml-2 h-[42px]"
            data-testid="admin-date-picker"
          />
        </div>

        {/* Center: Booking Count */}
        <div className="hidden md:flex items-center justify-center flex-1">
          <span
            className="text-sm text-gray-400 font-medium uppercase tracking-wider"
            data-testid="admin-booking-count"
          >
            {t('bookings', { count: bookingCount })}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {(isLoading || isProcessing) && <Spinner size="sm" />}

          {/* Selection Indicator */}
          {selectedSlot && (
            <div className="flex flex-col items-end mr-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                SELECTED
              </span>
              <span className="text-sm font-black text-black">
                {workers.find(w => w.id === selectedWorkerId)?.name} · {selectedSlot.startTime}
              </span>
            </div>
          )}

          {/* Actions Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="iso"
                size="sm"
                className={`h-[42px] min-w-[140px] gap-2 ${!selectedSlot ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-300' : ''}`}
                disabled={!selectedSlot}
              >
                {tCommon('actions')}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-2 border-2 border-black rounded-xl">
              <div className="font-black mb-2 px-2 text-sm uppercase tracking-wider">{t('blockTime')}</div>
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-bold uppercase hover:bg-black hover:text-white transition-colors"
                  onClick={() => handleBlockTime(60)}
                >
                  {t('duration1h')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-bold uppercase hover:bg-black hover:text-white transition-colors"
                  onClick={() => handleBlockTime(120)}
                >
                  {t('duration2h')}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Last updated indicator */}
      {lastUpdatedStr && (
        <div className="flex items-center gap-2 text-xs text-gray-500" data-testid="admin-last-updated">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          {t('lastUpdated')}
          {lastUpdatedStr}
        </div>
      )}

      {/* Date display */}
      <div className="text-lg font-medium text-gray-900" data-testid="admin-date-display">
        {format.dateTime(date, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })}
      </div>

      {/* Employee Timeline */}
      <EmployeeTimeline
        workers={workers}
        mode="admin"
        timeRange={{ start: '10:00', end: '19:00' }}
        onSlotRemove={handleSlotRemove}
        onSlotSelect={handleSlotSelect}
        selectedSlot={selectedSlot}
        selectedWorkerId={selectedWorkerId}
        className="min-h-[400px]"
      />
    </div>
  )
}
