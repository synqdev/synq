'use client'

import { forwardRef, useMemo, type HTMLAttributes } from 'react'
import type { CalendarProps, CalendarSlot, CalendarWorker } from '@/types/calendar'
import { WorkerRow } from './worker-row'

export interface TimelineCalendarProps
  extends CalendarProps,
    Omit<HTMLAttributes<HTMLDivElement>, 'slot'> {}

/**
 * Generate time labels for the header row.
 * Returns array of time strings like ["09:00", "10:00", ...]
 */
function generateTimeLabels(
  start: string = '09:00',
  end: string = '19:00'
): string[] {
  const labels: string[] = []
  const [startHour] = start.split(':').map(Number)
  const [endHour] = end.split(':').map(Number)

  for (let hour = startHour; hour <= endHour; hour++) {
    labels.push(`${hour.toString().padStart(2, '0')}:00`)
  }

  return labels
}

/**
 * Get slots for a specific worker from the slots array.
 */
function getSlotsForWorker(
  slots: CalendarSlot[],
  workerId: string,
  timeLabels: string[]
): CalendarSlot[] {
  // Create a map of existing slots by time
  const slotMap = new Map<string, CalendarSlot>()
  slots
    .filter((s) => s.workerId === workerId)
    .forEach((s) => slotMap.set(s.time, s))

  // Return slots in order, creating empty available slots if needed
  return timeLabels.map((time) => {
    const existing = slotMap.get(time)
    if (existing) return existing
    // Default to available if no slot data
    return {
      time,
      workerId,
      isAvailable: true,
      booking: null,
    }
  })
}

/**
 * Timeline calendar component showing workers as rows and time slots as columns.
 * Supports read-only (user) and interactive (admin) modes.
 */
export const TimelineCalendar = forwardRef<
  HTMLDivElement,
  TimelineCalendarProps
>(
  (
    {
      date,
      workers,
      slots,
      mode,
      onSlotSelect,
      onBookingClick,
      selectedSlot,
      timeRange = { start: '09:00', end: '19:00' },
      className = '',
      ...props
    },
    ref
  ) => {
    // Generate time labels for header
    const timeLabels = useMemo(
      () => generateTimeLabels(timeRange.start, timeRange.end),
      [timeRange.start, timeRange.end]
    )

    // Determine if we should show booking details (admin mode)
    const showBookingDetails = mode === 'interactive'

    // Get worker slots with proper ordering
    const getWorkerSlots = (worker: CalendarWorker) =>
      getSlotsForWorker(slots, worker.id, timeLabels)

    return (
      <div
        ref={ref}
        className={`
          relative overflow-auto
          border border-gray-200 rounded-lg
          bg-white
          ${className}
        `}
        {...props}
      >
        {/* Header row with time labels */}
        <div className="sticky top-0 z-20 flex border-b border-gray-300 bg-gray-50">
          {/* Empty cell above worker names */}
          <div className="sticky left-0 z-30 min-w-[120px] w-[120px] px-3 py-2 bg-gray-50 border-r border-gray-300" />

          {/* Time labels */}
          <div className="flex">
            {timeLabels.map((time) => (
              <div
                key={time}
                className="
                  flex items-center justify-center
                  min-w-[60px] px-1 py-2
                  border-r border-gray-200
                  text-xs font-medium text-gray-600
                "
              >
                {time}
              </div>
            ))}
          </div>
        </div>

        {/* Worker rows */}
        <div>
          {workers.map((worker) => (
            <WorkerRow
              key={worker.id}
              worker={worker}
              slots={getWorkerSlots(worker)}
              mode={mode}
              onSlotSelect={onSlotSelect}
              selectedSlot={selectedSlot}
              showBookingDetails={showBookingDetails}
            />
          ))}
        </div>

        {/* Empty state when no workers */}
        {workers.length === 0 && (
          <div className="flex items-center justify-center py-12 text-gray-500">
            No workers available for this date.
          </div>
        )}
      </div>
    )
  }
)

TimelineCalendar.displayName = 'TimelineCalendar'
