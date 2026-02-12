// Calendar Component Library
// Timeline calendar for SYNQ booking system
// Supports read-only (user) and interactive (admin) modes

export { EmployeeTimeline, type EmployeeTimelineProps, type TimelineSlot, type TimelineWorker } from './employee-timeline'
export {
  SettingsRail,
  TimelineBar,
  TimePassedOverlay,
  TimetableWithTabs,
  type TopTabItem,
  type SideActionItem,
  type TimelineStaff,
  type TimelineBarItem,
  type TimelineBarType,
  type SettingsRailProps,
  type TimelineBarProps,
  type TimePassedOverlayProps,
  type TimetableWithTabsProps,
} from './prototype-calendar-view'

// Re-export types from calendar types module
export type {
  CalendarSlot,
  CalendarWorker,
  CalendarBooking,
  CalendarProps,
  TimeSlotProps,
  WorkerRowProps,
} from '@/types/calendar'
