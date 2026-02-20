/**
 * Calendar Data Mappers
 *
 * Transforms API responses into EmployeeTimeline component format.
 * Separates data transformation from presentation logic.
 */

import type { AvailableSlot } from '@/lib/services/availability.service'
import type { TimelineWorker, TimelineSlot } from '@/components/calendar/employee-timeline'
import { formatInTimeZone } from '@/lib/utils/time'

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
  serviceId: string // Added for blocking identification
}

/**
 * Maps availability API response to EmployeeTimeline format.
 * Transforms backend availability data into the structure required by the timeline component.
 */
export function mapAvailabilityToCalendar(response: AvailabilityResponse): TimelineWorker[] {
  return response.workers.map(worker => {
    // Convert available slots to timeline format
    const slots: TimelineSlot[] = worker.slots.map(slot => {
      // Parse duration from slot or use default if needed
      // Currently assuming slot has duration or we calculate it
      // For now, let's assume the API returns slots with duration or end time
      // If we need to calculate duration from start/end:
      const startTime = new Date(`2000-01-01T${slot.startTime}`)
      const endTime = new Date(`2000-01-01T${slot.endTime}`)
      const duration = (endTime.getTime() - startTime.getTime()) / 60000 // minutes

      return {
        startTime: slot.startTime,
        duration: duration,
        type: 'available',
        data: {
          resourceIds: slot.availableResourceIds,
          endTime: slot.endTime
        }
      }
    })

    return {
      id: worker.id,
      name: worker.name,
      nameEn: worker.nameEn,
      slots
    }
  })
}

/**
 * Maps admin bookings to EmployeeTimeline format.
 * ...
 */
export function mapAdminBookingsToCalendar(
  workers: Array<{ id: string; name: string; nameEn?: string }>,
  bookings: AdminBooking[]
): TimelineWorker[] {
  return workers.map(worker => {
    // ... baseSlot code ...
    const baseSlot: TimelineSlot = {
      startTime: '10:00',
      duration: 540,
      type: 'available',
      data: {}
    }

    const bookingSlots = bookings
      .filter(b => b.workerId === worker.id)
      .map(booking => {
        // Convert UTC Date to JST time string
        const { time: start } = formatInTimeZone(booking.startsAt)
        const duration = Math.floor(
          (booking.endsAt.getTime() - booking.startsAt.getTime()) / 60000
        )

        const isBlocked = booking.serviceId === 'block-service'

        return {
          startTime: start,
          duration,
          type: isBlocked ? 'blocked' : 'booked',
          data: {
            bookingId: booking.id,
            customer: booking.customerName,
            status: booking.status,
          },
        } as TimelineSlot
      })

    return {
      id: worker.id,
      name: worker.name,
      nameEn: worker.nameEn,
      slots: [baseSlot, ...bookingSlots]
    }
  })
}

/**
 * Merges available slots with existing bookings.
 * ...
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

        const isBlocked = booking.serviceId === 'block-service'

        return {
          startTime: start,
          duration,
          type: isBlocked ? 'blocked' : 'booked',
          data: { customer: booking.customerName },
        } as TimelineSlot
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


