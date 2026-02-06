import { forwardRef, useMemo, useState } from 'react'
import type { CalendarProps } from '@/types/calendar'

// Simplified event type for the timeline
export interface TimelineEvent {
    workerId: string
    time: string
    duration: number
    type: 'booked' | 'blocked'
    data?: any
}

export interface EmployeeTimelineProps extends Omit<CalendarProps, 'mode' | 'onBookingClick' | 'onSlotSelect' | 'selectedSlot'> {
    events?: TimelineEvent[]
    className?: string
    onEventRemove?: (event: TimelineEvent) => void
}

/**
 * EmployeeTimeline component.
 * Visualizes worker schedules as a continuous timeline strip.
 * - Dark grey: Blocked/Unavailable
 * - Light blue: Booked
 * - White: Available
 */
export const EmployeeTimeline = forwardRef<HTMLDivElement, EmployeeTimelineProps>(
    ({ date, workers = [], events = [], timeRange = { start: '10:00', end: '19:00' }, className = '', ...props }, ref) => {
        const [eventToCancel, setEventToCancel] = useState<TimelineEvent | null>(null)

        // Helper to convert time string (HH:MM) to minutes from midnight
        const timeToMinutes = (time: string) => {
            if (!time) return 0
            const parts = time.split(':')
            if (parts.length < 2) return 0
            const [hours, minutes] = parts.map(Number)
            return hours * 60 + (minutes || 0)
        }

        const startMinutes = useMemo(() => timeToMinutes(timeRange?.start || '10:00'), [timeRange])
        const endMinutes = useMemo(() => timeToMinutes(timeRange?.end || '19:00'), [timeRange])
        const totalDuration = endMinutes - startMinutes

        // Generate time labels (hours)
        const timeLabels = useMemo(() => {
            const labels: string[] = []
            const startStr = timeRange?.start || '10:00'
            const endStr = timeRange?.end || '19:00'

            const [startHour] = startStr.split(':').map(Number)
            const [endHour] = endStr.split(':').map(Number)

            if (!isNaN(startHour) && !isNaN(endHour)) {
                for (let hour = startHour; hour <= endHour; hour++) {
                    labels.push(`${hour.toString().padStart(2, '0')}:00`)
                }
            }
            return labels
        }, [timeRange])

        return (
            <div ref={ref} className={`flex flex-col gap-8 ${className}`} {...props}>
                {workers.map((worker) => {
                    const workerEvents = events.filter(e => e.workerId === worker.id)

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

                                {/* Events Overlay - Overflow visible for popover */}
                                <div className="absolute top-0 left-0 w-full h-16 pointer-events-none z-10 rounded-xl">
                                    {workerEvents.map((event, index) => {
                                        const eventStart = timeToMinutes(event.time)
                                        const offset = eventStart - startMinutes

                                        // Calculate positioning percentages
                                        const left = (offset / totalDuration) * 100
                                        const width = (event.duration / totalDuration) * 100

                                        let bgColor = '#e5e7eb' // default gray-200
                                        const type = event.type?.toLowerCase()

                                        if (type === 'booked') {
                                            bgColor = '#90C0D0'
                                        } else if (type === 'blocked') {
                                            bgColor = '#666666'
                                        }

                                        const isConfirming = eventToCancel === event

                                        return (
                                            <div
                                                key={`${event.time}-${index}`}
                                                className={`absolute top-0 h-full group pointer-events-auto transition-all flex items-center justify-center border-r border-gray-200 box-border ${isConfirming ? 'z-50' : ''}`}
                                                style={{
                                                    left: `${left}%`,
                                                    width: `${width}%`,
                                                    backgroundColor: bgColor
                                                }}
                                            >
                                                {/* Popover UI */}
                                                {isConfirming && (
                                                    <div className="absolute bottom-full mb-2 flex items-center gap-1 bg-black text-white p-1 rounded-full shadow-lg z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
                                                        <span className="text-[10px] font-bold px-2 uppercase tracking-wide">Cancel?</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                props.onEventRemove?.(event)
                                                                setEventToCancel(null)
                                                            }}
                                                            className="p-1 rounded-full bg-white text-black hover:bg-gray-200 transition-colors"
                                                            title="Confirm"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setEventToCancel(null)
                                                            }}
                                                            className="p-1 rounded-full hover:bg-white/20 transition-colors"
                                                            title="Close"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                        </button>
                                                        {/* Triangle/Arrow */}
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 text-black w-2 overflow-hidden">
                                                            <svg width="10" height="5" viewBox="0 0 10 5" fill="currentColor"><path d="M0 0L5 5L10 0H0Z" /></svg>
                                                        </div>
                                                    </div>
                                                )}

                                                {type === 'booked' && (
                                                    <span className="text-white font-bold text-sm truncate px-4 select-none">
                                                        {event.data?.customer || event.data?.name || event.data?.title || 'Booked'}
                                                    </span>
                                                )}

                                                {type === 'booked' && props.onEventRemove && !isConfirming && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setEventToCancel(event)
                                                        }}
                                                        className="absolute top-1 right-1 p-0.5 rounded-full hover:bg-white/20 text-white/50 hover:text-white transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
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
                                                            <path d="m6 6 18 18" />
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
