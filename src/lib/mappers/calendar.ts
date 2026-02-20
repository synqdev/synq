/**
 * Calendar Data Mappers
 *
 * Transforms API responses into EmployeeTimeline component format.
 * Separates data transformation from presentation logic.
 */

import type { AvailableSlot } from '@/lib/services/availability.service'
import type { TimelineWorker, TimelineSlot } from '@/components/calendar/employee-timeline'

// API response types
export interface AvailabilityResponse {
  date: string
  serviceId: string
  serviceName: string
  serviceDuration: number
  workers: Array<{
    id: string
    name: string
    nameEn?: string
    slots: AvailableSlot[]
  }>
}

export interface AdminBooking {
  id: string
  workerId: string
  startsAt: Date
  endsAt: Date
  customerName: string
  status: string
}

/**
 * Maps availability API response to EmployeeTimeline format.
 * For user booking flow: shows available slots as clickable green blocks.
 *
 * @param response - Availability API response
 * @returns Workers with available slots in timeline format
 */
export function mapAvailabilityToCalendar(
  response: AvailabilityResponse
): TimelineWorker[] {
  return response.workers.map(worker => ({
    id: worker.id,
    name: worker.name,
    nameEn: worker.nameEn,
    slots: worker.slots.map(slot => ({
      startTime: slot.startTime,
      duration: slot.duration,
      type: 'available' as const,
      data: {
        resourceIds: slot.availableResourceIds,
        endTime: slot.endTime,
      },
    })),
  }))
}

/**
 * Maps admin bookings to EmployeeTimeline format.
 * For admin view: shows all bookings with cancel functionality.
 *
 * @param workers - List of workers
 * @param bookings - List of bookings to display
 * @returns Workers with bookings as timeline slots
 */
export function mapAdminBookingsToCalendar(
  workers: Array<{ id: string; name: string; nameEn?: string }>,
  bookings: AdminBooking[]
): TimelineWorker[] {
  return workers.map(worker => ({
    id: worker.id,
    name: worker.name,
    nameEn: worker.nameEn,
    slots: bookings
      .filter(b => b.workerId === worker.id)
      .map(booking => {
        const hours = booking.startsAt.getHours().toString().padStart(2, '0')
        const mins = booking.startsAt.getMinutes().toString().padStart(2, '0')
        const start = `${hours}:${mins}` // "HH:MM"
        const duration = Math.floor(
          (booking.endsAt.getTime() - booking.startsAt.getTime()) / 60000
        )

        return {
          startTime: start,
          duration,
          type: 'booked' as const,
          data: {
            bookingId: booking.id,
            customer: booking.customerName,
            status: booking.status,
          },
        }
      }),
  }))
}

/**
 * Merges available slots with existing bookings.
 * For user view with context: shows what's booked (gray) and what's available (green).
 *
 * @param availabilityResponse - Available slots from API
 * @param bookings - Existing bookings to show as unavailable
 * @returns Workers with both available and booked slots
 */
export function mapAvailabilityWithBookings(
  availabilityResponse: AvailabilityResponse,
  bookings: AdminBooking[]
): TimelineWorker[] {
  return availabilityResponse.workers.map(worker => {
    const workerBookings = bookings
      .filter(b => b.workerId === worker.id)
      .map(booking => {
        const hours = booking.startsAt.getHours().toString().padStart(2, '0')
        const mins = booking.startsAt.getMinutes().toString().padStart(2, '0')
        const start = `${hours}:${mins}`
        const duration = Math.floor(
          (booking.endsAt.getTime() - booking.startsAt.getTime()) / 60000
        )

        return {
          startTime: start,
          duration,
          type: 'booked' as const,
          data: { customer: booking.customerName },
        }
      })

    const availableSlots = worker.slots.map(slot => ({
      startTime: slot.startTime,
      duration: slot.duration,
      type: 'available' as const,
      data: {
        resourceIds: slot.availableResourceIds,
        endTime: slot.endTime,
      },
    }))

    return {
      id: worker.id,
      name: worker.name,
      nameEn: worker.nameEn,
      slots: [...workerBookings, ...availableSlots].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      ),
    }
  })
}
