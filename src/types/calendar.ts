/**
 * Calendar component types for SYNQ booking system.
 * Supports both user-facing (readonly) and admin (interactive) calendar views.
 */

export interface CalendarWorker {
  id: string
  name: string
  nameEn?: string
}

export interface CalendarBooking {
  id: string
  startsAt: Date
  endsAt: Date
  workerId: string
  resourceId: string
  customerName?: string   // For admin view
  customerEmail?: string  // For admin view
  serviceName?: string    // For admin view
  status: 'CONFIRMED' | 'CANCELLED' | 'NOSHOW'
}

export interface CalendarSlot {
  time: string           // "09:00" format
  workerId: string
  resourceId?: string    // Assigned resource if available
  isAvailable: boolean
  booking?: CalendarBooking  // Booking if slot is occupied
}

export interface CalendarProps {
  /** Date to display calendar for */
  date: Date
  /** Workers to display as rows */
  workers: CalendarWorker[]
  /** Time slots with availability and bookings */
  slots: CalendarSlot[]
  /** readonly = user view (no selection), interactive = admin view (can select) */
  mode: 'readonly' | 'interactive'
  /** Callback when a slot is selected (interactive mode only) */
  onSlotSelect?: (slot: CalendarSlot) => void
  /** Callback when a booking is clicked (admin mode) */
  onBookingClick?: (booking: CalendarBooking) => void
  /** Currently selected slot */
  selectedSlot?: CalendarSlot | null
  /** Time range to display (default 09:00 to 19:00) */
  timeRange?: { start: string; end: string }
}

export interface TimeSlotProps {
  slot: CalendarSlot
  mode: 'readonly' | 'interactive'
  isSelected: boolean
  onClick?: () => void
  showBookingDetails?: boolean
}

export interface WorkerRowProps {
  worker: CalendarWorker
  slots: CalendarSlot[]
  mode: 'readonly' | 'interactive'
  onSlotSelect?: (slot: CalendarSlot) => void
  selectedSlot?: CalendarSlot | null
  showBookingDetails?: boolean
}
