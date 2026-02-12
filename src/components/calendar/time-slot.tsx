'use client'

import { forwardRef, type HTMLAttributes } from 'react'
import type { TimeSlotProps } from '@/types/calendar'

const slotVariants = {
  available: 'bg-gray-100 hover:bg-gray-200',
  availableInteractive: 'bg-gray-100 hover:bg-primary-100 cursor-pointer',
  booked: 'bg-primary-200 text-primary-800',
  bookedInteractive: 'bg-primary-200 text-primary-800 hover:bg-primary-300 cursor-pointer',
  selected: 'ring-2 ring-primary-500 ring-offset-1',
} as const

export interface TimeSlotComponentProps
  extends TimeSlotProps,
    Omit<HTMLAttributes<HTMLDivElement>, 'onClick' | 'slot'> {}

/**
 * Individual time slot cell for the calendar.
 * Shows available (light) vs booked (dark) states.
 * Supports selection highlighting and booking details.
 */
export const TimeSlot = forwardRef<HTMLDivElement, TimeSlotComponentProps>(
  (
    {
      slot,
      mode,
      isSelected,
      onClick,
      showBookingDetails = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const isInteractive = mode === 'interactive'
    const isAvailable = slot.isAvailable
    const hasBooking = !!slot.booking

    // Determine visual state
    let variantClass = isAvailable
      ? isInteractive
        ? slotVariants.availableInteractive
        : slotVariants.available
      : isInteractive
        ? slotVariants.bookedInteractive
        : slotVariants.booked

    // Add selected ring if selected
    const selectedClass = isSelected ? slotVariants.selected : ''

    const handleClick = () => {
      if (isInteractive && onClick) {
        onClick()
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (isInteractive && onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        onClick()
      }
    }

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={isInteractive ? 0 : -1}
        aria-pressed={isSelected}
        aria-label={`${slot.time}, ${isAvailable ? 'available' : 'booked'}${
          hasBooking && slot.booking?.customerName
            ? `, ${slot.booking.customerName}`
            : ''
        }`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`
          flex flex-col items-center justify-center
          min-h-[48px] min-w-[60px] p-1
          border-r border-b border-gray-200
          text-xs
          transition-colors duration-150
          ${!isInteractive ? 'pointer-events-none' : ''}
          ${variantClass}
          ${selectedClass}
          ${className}
        `}
        {...props}
      >
        {/* Show booking details in admin mode */}
        {hasBooking && showBookingDetails && slot.booking && (
          <div className="flex flex-col items-center gap-0.5 overflow-hidden">
            {slot.booking.customerName && (
              <span className="truncate max-w-full font-medium text-[10px]">
                {slot.booking.customerName}
              </span>
            )}
            {slot.booking.serviceName && (
              <span className="truncate max-w-full text-[9px] opacity-75">
                {slot.booking.serviceName}
              </span>
            )}
          </div>
        )}
        {/* Show availability indicator when no booking details */}
        {!hasBooking && isAvailable && (
          <span className="text-gray-400 text-[10px]">-</span>
        )}
      </div>
    )
  }
)

TimeSlot.displayName = 'TimeSlot'
