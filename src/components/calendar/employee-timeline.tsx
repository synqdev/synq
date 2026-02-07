import { forwardRef, useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

const BookingActionMenu = ({
    onEdit,
    onViewNotes,
    onCancel,
    isDarkBackground = false
}: {
    onEdit: () => void
    onViewNotes: () => void
    onCancel: () => void
    isDarkBackground?: boolean
}) => {
    const [showConfirm, setShowConfirm] = useState(false)

    return (
        <Popover onOpenChange={(open) => !open && setShowConfirm(false)}>
            <PopoverTrigger asChild>
                <button
                    className={`p-1 rounded-full hover:bg-white/50 transition-colors cursor-pointer ${isDarkBackground ? 'text-white/80 hover:text-white' : 'text-gray-500 hover:text-black'
                        }`}
                    aria-label="Options"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="19" cy="12" r="1" />
                        <circle cx="5" cy="12" r="1" />
                    </svg>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="end">
                {showConfirm ? (
                    <div className="flex flex-col gap-2 p-2">
                        <p className="text-sm font-medium text-center">Are you sure?</p>
                        <div className="flex gap-2 justify-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setShowConfirm(false)}
                            >
                                No
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 px-2 text-xs bg-red-600 text-white hover:bg-red-700 hover:text-white border-0"
                                onClick={onCancel}
                            >
                                Yes, Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        <button
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors font-medium"
                            onClick={onEdit}
                        >
                            Edit Details
                        </button>
                        <button
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors font-medium"
                            onClick={onViewNotes}
                        >
                            View Notes
                        </button>
                        <div className="h-px bg-gray-100 my-1" />
                        <button
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 rounded-md transition-colors font-bold"
                            onClick={() => setShowConfirm(true)}
                        >
                            Cancel Booking
                        </button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}

// Timeline slot types (re-exporting for compatibility if needed, or renaming)
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
    onSlotSelect?: (slot: TimelineSlot, workerId: string) => void
    selectedSlot?: TimelineSlot | null
    selectedWorkerId?: string | null
    onSlotClick?: (slot: TimelineSlot, workerId: string) => void
    onSlotRemove?: (slot: TimelineSlot, workerId: string) => void
    timeRange?: { start: string; end: string }
    className?: string
    date?: Date | string // Added for compatibility/reference
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
// Helper to convert time string (HH:MM) to minutes from midnight
const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + (minutes || 0)
}

export const EmployeeTimeline = forwardRef<HTMLDivElement, EmployeeTimelineProps>(
    ({
        workers,
        mode = 'user',
        selectedSlot,
        selectedWorkerId,
        onSlotClick,
        onSlotSelect,
        onSlotRemove,
        timeRange = { start: '10:00', end: '19:00' },
        className = '',
        // date is destructured but not used in rendering currently
    }, ref) => {

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
        const getSlotColor = (type: TimelineSlot['type'], isSelected: boolean) => {
            if (isSelected) return '#3b82f6' // Blue for selected
            if (type === 'available') return '#d1fae5' // Green tint
            if (type === 'booked') return '#e5e7eb'    // Gray (unavailable)
            if (type === 'blocked') return '#666666'   // Dark gray
            return '#e5e7eb'
        }

        // Pre-process workers to split available slots into 60-minute segments
        const displayWorkers = useMemo(() => {
            return workers.map((worker) => {
                const splitSlots: TimelineSlot[] = []

                worker.slots.forEach((slot) => {
                    // Only split available slots, usually for user selection granularly
                    if (slot.type === 'available' && slot.duration > 60) {
                        const chunks = Math.floor(slot.duration / 60)
                        const startMin = timeToMinutes(slot.startTime)

                        for (let i = 0; i < chunks; i++) {
                            const chunkStartMin = startMin + (i * 60)
                            const hours = Math.floor(chunkStartMin / 60)
                            const mins = chunkStartMin % 60
                            const startTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`

                            splitSlots.push({
                                ...slot,
                                startTime,
                                duration: 60
                            })
                        }

                        // Handle remainder
                        const remainder = slot.duration % 60
                        if (remainder > 0) {
                            const chunkStartMin = startMin + (chunks * 60)
                            const hours = Math.floor(chunkStartMin / 60)
                            const mins = chunkStartMin % 60
                            const startTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`

                            splitSlots.push({
                                ...slot,
                                startTime,
                                duration: remainder
                            })
                        }
                    } else {
                        splitSlots.push(slot)
                    }
                })

                return {
                    ...worker,
                    slots: splitSlots
                }
            })
        }, [workers])

        return (
            <div
                ref={ref}
                className={`flex flex-col gap-8 ${className}`}
                data-testid="employee-timeline"
            >
                {displayWorkers.map((worker) => {
                    return (
                        <div key={worker.id} className="flex flex-col gap-1">
                            {/* Worker Name Label */}
                            <div
                                className="text-xl font-bold font-mono uppercase tracking-wider pl-1 text-black"
                                data-testid="timeline-worker-name"
                                data-worker-id={worker.id}
                            >
                                {worker.name}
                            </div>

                            {/* Timeline Container */}
                            <div className="relative w-full max-w-4xl h-16 mb-6">
                                {/* Background Layer */}
                                <div className="absolute inset-0 bg-white rounded-xl shadow-sm z-0" />

                                {/* Slots Layer (Base) */}
                                <div className="absolute inset-0 z-10 rounded-xl overflow-hidden">
                                    {worker.slots.map((slot, index) => {
                                        const slotStart = timeToMinutes(slot.startTime)
                                        const offset = slotStart - startMinutes

                                        // Calculate positioning percentages
                                        const left = (offset / totalDuration) * 100
                                        const width = (slot.duration / totalDuration) * 100

                                        // Check if this specific slot is selected (must match worker + time)
                                        const isSelectedMatch = selectedSlot &&
                                            selectedWorkerId === worker.id &&
                                            selectedSlot.startTime === slot.startTime &&
                                            selectedSlot.type === slot.type

                                        const bgColor = getSlotColor(slot.type, isSelectedMatch || false)

                                        const isClickable = mode === 'user' && slot.type === 'available'
                                        const hasRemoveButton = mode === 'admin' && (slot.type === 'booked' || slot.type === 'blocked') && onSlotRemove
                                        // Z-index hierarchy: Booked/Blocked > Available. Selection boosts Z.
                                        const zIndex = (slot.type === 'booked' || slot.type === 'blocked')
                                            ? (isSelectedMatch ? 'z-[40]' : 'z-[30]')
                                            : (isSelectedMatch ? 'z-[20]' : 'z-[10]')

                                        return (
                                            <div
                                                key={`${slot.startTime}-${index}`}
                                                className={`absolute top-0 bottom-0 group transition-all flex items-center justify-center
                                                    ${zIndex}
                                                    ${(isClickable || (mode === 'admin' && slot.type === 'available')) ? 'cursor-pointer hover:brightness-95' : ''}
                                                `}
                                                style={{
                                                    left: `${left}%`,
                                                    width: `${width}%`,
                                                    backgroundColor: bgColor
                                                }}
                                                onClick={() => {
                                                    // User mode: Click to book (if available)
                                                    if (mode === 'user' && slot.type === 'available' && onSlotClick) {
                                                        onSlotClick(slot, worker.id)
                                                    }
                                                    // Admin mode: Click to select (if available)
                                                    if (mode === 'admin' && slot.type === 'available' && onSlotSelect) {
                                                        onSlotSelect(slot, worker.id)
                                                    }
                                                }}
                                            >
                                                {/* Booking Name */}
                                                {slot.type === 'booked' && (
                                                    <span
                                                        className="text-gray-700 font-bold text-sm truncate px-4 select-none"
                                                        data-testid="timeline-slot-booked"
                                                    >
                                                        {slot.data?.customer || slot.data?.name || slot.data?.title || 'Booked'}
                                                    </span>
                                                )}

                                                {/* Available slot indicator */}
                                                {slot.type === 'available' && mode === 'user' && (
                                                    <span
                                                        className={`font-bold text-xs truncate px-4 select-none ${isSelectedMatch ? 'text-white' : 'text-green-700'}`}
                                                        data-testid="timeline-slot-available"
                                                    >
                                                        {isSelectedMatch ? 'Selected' : 'Available'}
                                                    </span>
                                                )}

                                                {/* Remove button (admin mode only) */}
                                                {hasRemoveButton && (
                                                    <div onClick={(e) => e.stopPropagation()} className="absolute top-1 right-1 z-[60]">
                                                        <BookingActionMenu
                                                            onEdit={() => console.log('Edit clicked')}
                                                            onViewNotes={() => console.log('Notes clicked')}
                                                            onCancel={() => onSlotRemove(slot, worker.id)}
                                                            isDarkBackground={slot.type === 'blocked'}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Grid Overlay (Top) */}
                                <div className="absolute inset-0 flex rounded-xl overflow-hidden pointer-events-none z-20 border border-gray-200">
                                    {timeLabels.slice(0, -1).map((time) => (
                                        <div
                                            key={time}
                                            className="flex-1 border-r border-gray-200 last:border-r-0"
                                        />
                                    ))}
                                </div>

                                {/* Time Labels (bottom-left inside each cell) */}
                                <div className="absolute bottom-1 left-0 w-full flex pointer-events-none z-30">
                                    {timeLabels.map((time) => (
                                        <div
                                            key={time}
                                            className="flex-1 text-[10px] font-bold text-black px-1 text-left"
                                            data-testid="timeline-time-label"
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
