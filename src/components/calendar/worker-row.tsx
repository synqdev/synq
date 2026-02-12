'use client'

import { forwardRef, type HTMLAttributes } from 'react'
import type { WorkerRowProps, CalendarSlot } from '@/types/calendar'
import { TimeSlot } from './time-slot'

export interface WorkerRowComponentProps
  extends WorkerRowProps,
    Omit<HTMLAttributes<HTMLDivElement>, 'slot'> {}

/**
 * Worker row component for the calendar.
 * Displays worker name on the left and time slots in a grid.
 */
export const WorkerRow = forwardRef<HTMLDivElement, WorkerRowComponentProps>(
  (
    {
      worker,
      slots,
      mode,
      onSlotSelect,
      selectedSlot,
      showBookingDetails = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const handleSlotClick = (slot: CalendarSlot) => {
      if (mode === 'interactive' && onSlotSelect) {
        onSlotSelect(slot)
      }
    }

    const isSlotSelected = (slot: CalendarSlot): boolean => {
      if (!selectedSlot) return false
      return (
        selectedSlot.time === slot.time && selectedSlot.workerId === slot.workerId
      )
    }

    return (
      <div
        ref={ref}
        className={`
          flex items-stretch
          border-b border-gray-200
          ${className}
        `}
        {...props}
      >
        {/* Worker name - sticky left */}
        <div
          className="
            sticky left-0 z-10
            flex items-center
            min-w-[120px] w-[120px] px-3
            bg-white border-r border-gray-200
            text-sm font-medium text-gray-700
          "
        >
          <span className="truncate">{worker.name}</span>
        </div>

        {/* Time slots grid */}
        <div className="flex">
          {slots.map((slot) => (
            <TimeSlot
              key={`${slot.workerId}-${slot.time}`}
              slot={slot}
              mode={mode}
              isSelected={isSlotSelected(slot)}
              onClick={() => handleSlotClick(slot)}
              showBookingDetails={showBookingDetails}
            />
          ))}
        </div>
      </div>
    )
  }
)

WorkerRow.displayName = 'WorkerRow'
