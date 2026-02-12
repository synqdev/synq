// Calendar Component Library
// Timeline calendar for SYNQ booking system
// Supports read-only (user) and interactive (admin) modes

export { TimelineCalendar, type TimelineCalendarProps } from './timeline-calendar'
export { WorkerRow, type WorkerRowComponentProps } from './worker-row'
export { TimeSlot, type TimeSlotComponentProps } from './time-slot'

// Re-export types from calendar types module
export type {
  CalendarSlot,
  CalendarWorker,
  CalendarBooking,
  CalendarProps,
  TimeSlotProps,
  WorkerRowProps,
} from '@/types/calendar'
