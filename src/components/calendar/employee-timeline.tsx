import { forwardRef, useMemo } from 'react'

// Timeline slot types
export interface TimelineSlot {
  startTime: string    // "10:00"
  duration: number     // 60
  type: 'available' | 'booked' | 'blocked'
  data?: any          // { customer, resourceIds, bookingId, etc. }
}

export interface TimelineWorker {
  id: string
  name: string
  nameEn?: string
  slots: TimelineSlot[]
}

export interface EmployeeTimelineProps {
  workers: TimelineWorker[]
  mode?: 'admin' | 'user'
  onSlotClick?: (slot: TimelineSlot, workerId: string) => void
  onSlotRemove?: (slot: TimelineSlot, workerId: string) => void
  timeRange?: { start: string; end: string }
  className?: string
}

/**
 * EmployeeTimeline component.
 * Visualizes worker schedules as a continuous timeline strip.
 * - Green (#d1fae5): Available slots (user mode - clickable)
 * - Gray (#e5e7eb): Booked slots
 * - Dark gray (#666666): Blocked slots
 *
 * Mode:
 * - admin: Shows X button on booked slots for cancellation
 * - user: Makes available slots clickable for booking
 */
export const EmployeeTimeline = forwardRef<HTMLDivElement, EmployeeTimelineProps>(
  ({
    workers,
    mode = 'user',
    onSlotClick,
    onSlotRemove,
    timeRange = { start: '10:00', end: '19:00' },
    className = ''
  }, ref) => {

    // Helper to convert time string (HH:MM) to minutes from midnight
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * 60 + (minutes || 0)
    }

    const startMinutes = useMemo(() => timeToMinutes(timeRange.start), [timeRange.start])
    const endMinutes = useMemo(() => timeToMinutes(timeRange.end), [timeRange.end])
    const totalDuration = endMinutes - startMinutes

    // Generate time labels (hours)
    const timeLabels = useMemo(() => {
      const labels: string[] = []
      const [startHour] = timeRange.start.split(':').map(Number)
      const [endHour] = timeRange.end.split(':').map(Number)

      for (let hour = startHour; hour <= endHour; hour++) {
        labels.push(`${hour.toString().padStart(2, '0')}:00`)
      }
      return labels
    }, [timeRange.start, timeRange.end])

    // Get slot color based on type
    const getSlotColor = (type: TimelineSlot['type']) => {
      if (type === 'available') return '#d1fae5' // Green tint
      if (type === 'booked') return '#e5e7eb'    // Gray (unavailable)
      if (type === 'blocked') return '#666666'   // Dark gray
      return '#e5e7eb'
    }

    return (
      <div ref={ref} className={`flex flex-col gap-8 ${className}`}>
        {workers.map((worker) => {
          return (
            <div key={worker.id} className="flex flex-col gap-1">
              {/* Worker Name Label */}
              <div className="text-xl font-bold font-mono uppercase tracking-wider pl-1 text-black">
                {worker.name}
              </div>

              {/* Timeline Container */}
              <div className="relative w-full max-w-4xl">
                {/* Base Grid (Hours) */}
                <div className="flex rounded-xl overflow-hidden h-16 w-full bg-white shadow-sm relative z-0">
                  {timeLabels.slice(0, -1).map((time) => (
                    <div
                      key={time}
                      className="flex-1 border-r border-gray-200 last:border-r-0"
                    />
                  ))}
                </div>

                {/* Slots Overlay */}
                <div className="absolute top-0 left-0 w-full h-16 pointer-events-none z-10 rounded-xl overflow-hidden">
                  {worker.slots.map((slot, index) => {
                    const slotStart = timeToMinutes(slot.startTime)
                    const offset = slotStart - startMinutes

                    // Calculate positioning percentages
                    const left = (offset / totalDuration) * 100
                    const width = (slot.duration / totalDuration) * 100

                    const bgColor = getSlotColor(slot.type)

                    // User mode: available slots are clickable
                    const isClickable = mode === 'user' && slot.type === 'available'

                    // Admin mode: booked slots have remove button
                    const hasRemoveButton = mode === 'admin' && slot.type === 'booked' && onSlotRemove

                    return (
                      <div
                        key={`${slot.startTime}-${index}`}
                        className={`absolute top-0 h-full group pointer-events-auto transition-all flex items-center justify-center border-r border-gray-200 box-border ${
                          isClickable ? 'cursor-pointer hover:brightness-95' : ''
                        }`}
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          backgroundColor: bgColor
                        }}
                        onClick={() => {
                          if (isClickable && onSlotClick) {
                            onSlotClick(slot, worker.id)
                          }
                        }}
                      >
                        {/* Booking Name */}
                        {slot.type === 'booked' && (
                          <span className="text-gray-700 font-bold text-sm truncate px-4 select-none">
                            {slot.data?.customer || slot.data?.name || slot.data?.title || 'Booked'}
                          </span>
                        )}

                        {/* Available slot indicator */}
                        {slot.type === 'available' && mode === 'user' && (
                          <span className="text-green-700 font-bold text-xs truncate px-4 select-none">
                            Available
                          </span>
                        )}

                        {/* Remove button (admin mode only) */}
                        {hasRemoveButton && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onSlotRemove(slot, worker.id)
                            }}
                            className="absolute top-1 right-1 p-0.5 rounded-full hover:bg-white/20 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                            aria-label="Remove booking"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Time Labels below */}
                <div className="flex w-full px-0 mt-1">
                  {timeLabels.map((time) => (
                    <div
                      key={time}
                      className="flex-1 text-[10px] font-bold text-black -ml-2"
                    >
                      {time}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }
)

EmployeeTimeline.displayName = 'EmployeeTimeline'
