// Calendar Component Library
// Timeline calendar for SYNQ booking system
// Supports read-only (user) and interactive (admin) modes

export { EmployeeTimeline, type EmployeeTimelineProps, type TimelineSlot, type TimelineWorker } from './employee-timeline'

// Re-export types from calendar types module
export type {
  CalendarSlot,
  CalendarWorker,
  CalendarBooking,
  CalendarProps,
  TimeSlotProps,
  WorkerRowProps,
} from '@/types/calendar'
