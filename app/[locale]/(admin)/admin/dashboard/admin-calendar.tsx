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
import { EmployeeTimeline } from '@/components/calendar'
import { Button } from '@/components/ui/button'
import { ActionPopover } from '@/components/ui/action-popover'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { useCalendarPolling } from '@/hooks/useCalendarPolling'
import type { CalendarSlot, CalendarWorker } from '@/types/calendar'
import type { TimelineWorker, TimelineSlot } from '@/components/calendar/employee-timeline'
import { BookingModal, type BookingDetails, type Worker } from './booking-modal'
import { blockWorkerTime, cancelBooking } from '@/app/actions/admin-booking'

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

function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [hours, minutes] = time.split(':').map(Number)
  const total = hours * 60 + minutes + minutesToAdd
  const nextHours = Math.floor(total / 60)
  const nextMinutes = total % 60
  return `${nextHours.toString().padStart(2, '0')}:${nextMinutes
    .toString()
    .padStart(2, '0')}`
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
  const [selectedSlot, setSelectedSlot] = useState<TimelineSlot | null>(null)
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)
  const [blockDuration, setBlockDuration] = useState('60')
  const [isBlocking, setIsBlocking] = useState(false)

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

  // Transform to TimelineWorker format for EmployeeTimeline
  const timelineWorkers: TimelineWorker[] = useMemo(() => {
    return workers.map((w) => {
      // Find slots for this worker
      const workerSlots = slots
        .filter((s) => s.workerId === w.id)
        .map((s): TimelineSlot => ({
          startTime: s.time,
          duration: 60, // Grid slots are typically 60 mins in this view
          type: s.booking ? 'booked' : (s.isAvailable ? 'available' : 'blocked'),
          data: s.booking
            ? {
              // store full booking for modal
              ...s.booking,
              bookingId: s.booking.id,
              customer: s.booking.customerName,
            }
            : undefined
        }))

      return {
        id: w.id,
        name: w.name,
        nameEn: w.nameEn ?? undefined,
        slots: workerSlots,
      }
    })
  }, [workers, slots])

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

  const selectedWorker = selectedWorkerId
    ? workers.find((w) => w.id === selectedWorkerId)
    : null

  return (
    <div className="space-y-4">
      {/* Date navigation header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="iso" onClick={goToPrevious}>
            {locale === 'ja' ? '前日' : 'Previous'}
          </Button>
          <Button variant="iso" onClick={goToToday}>
            {locale === 'ja' ? '今日' : 'Today'}
          </Button>
          <Button variant="iso" onClick={goToNext}>
            {locale === 'ja' ? '翌日' : 'Next'}
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Input
            type="date"
            variant="iso"
            value={formatDateParam(date)}
            onChange={handleDateChange}
            className="w-48"
          />
          <ActionPopover
            label={locale === 'ja' ? '操作' : 'Actions'}
            title={locale === 'ja' ? '時間をブロック' : 'Block Time'}
            actionLabel={locale === 'ja' ? '適用' : 'Apply'}
            actionDisabled={!selectedSlot || !selectedWorkerId || isBlocking}
            onAction={async () => {
              if (!selectedSlot || !selectedWorkerId) return
              const durationMinutes = Number(blockDuration)
              const blocks = Math.max(1, Math.floor(durationMinutes / 60))
              const dateValue = formatDateParam(date)
              try {
                setIsBlocking(true)
                for (let i = 0; i < blocks; i += 1) {
                  const startTime = addMinutesToTime(selectedSlot.startTime, i * 60)
                  const endTime = addMinutesToTime(selectedSlot.startTime, (i + 1) * 60)
                  const formData = new FormData()
                  formData.set('workerId', selectedWorkerId)
                  formData.set('date', dateValue)
                  formData.set('startTime', startTime)
                  formData.set('endTime', endTime)
                  await blockWorkerTime(formData)
                }
                setSelectedSlot(null)
                setSelectedWorkerId(null)
                refresh()
              } catch (error) {
                console.error('Failed to block time:', error)
                alert(locale === 'ja' ? 'ブロックに失敗しました' : 'Failed to block time')
              } finally {
                setIsBlocking(false)
              }
            }}
          >
            <div className="text-xs text-gray-600">
              {selectedWorker && selectedSlot
                ? `${selectedWorker.name} · ${selectedSlot.startTime}`
                : locale === 'ja'
                  ? '空き枠を選択してください'
                  : 'Select an available slot'}
            </div>
            <Select
              label={locale === 'ja' ? 'ブロック時間' : 'Block duration'}
              value={blockDuration}
              onChange={setBlockDuration}
              options={[
                { value: '60', label: locale === 'ja' ? '1時間' : '1 hour' },
                { value: '120', label: locale === 'ja' ? '2時間' : '2 hours' },
                { value: '180', label: locale === 'ja' ? '3時間' : '3 hours' },
                { value: '240', label: locale === 'ja' ? '4時間' : '4 hours' },
              ]}
              disabled={!selectedSlot || !selectedWorkerId || isBlocking}
            />
          </ActionPopover>
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
      <EmployeeTimeline
        workers={timelineWorkers}
        mode="admin"
        selectedSlot={selectedSlot}
        selectedWorkerId={selectedWorkerId}
        onSlotClick={(slot, workerId) => {
          if (slot.type === 'booked' && slot.data) {
            const bookingDetails: BookingDetails = {
              id: slot.data.id || slot.data.bookingId,
              startsAt: slot.data.startsAt,
              endsAt: slot.data.endsAt,
              workerId: slot.data.workerId,
              resourceId: slot.data.resourceId,
              customerName: slot.data.customerName || '',
              serviceName: slot.data.serviceName || '',
              status: slot.data.status
            }
            setSelectedBooking(bookingDetails)
            setIsModalOpen(true)
            return
          }
          if (slot.type === 'available') {
            if (selectedSlot?.startTime === slot.startTime && selectedWorkerId === workerId) {
              setSelectedSlot(null)
              setSelectedWorkerId(null)
            } else {
              setSelectedSlot(slot)
              setSelectedWorkerId(workerId)
            }
          }
        }}
        onSlotRemove={async (slot) => {
          if (slot.type === 'booked' && slot.data) {
            const bookingId = slot.data.id || slot.data.bookingId
            if (bookingId) {
              try {
                await cancelBooking(bookingId)
                refresh()
              } catch (error) {
                console.error('Failed to cancel booking:', error)
                alert(locale === 'ja' ? 'キャンセルに失敗しました' : 'Failed to cancel booking')
              }
            }
          }
        }}
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
