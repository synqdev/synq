import { describe, it, expect } from '@jest/globals'
import {
  mapAvailabilityToCalendar,
  mapAdminBookingsToCalendar,
  mapAvailabilityWithBookings,
  type AvailabilityResponse,
  type AdminBooking,
} from '@/lib/mappers/calendar'
import { toZonedTime } from '@/lib/utils/time'

describe('Calendar Mappers', () => {
  describe('mapAvailabilityToCalendar', () => {
    it('maps available slots correctly', () => {
      const response: AvailabilityResponse = {
        date: '2026-02-10',
        serviceId: 'service-shiatsu',
        serviceName: 'Shiatsu',
        serviceDuration: 60,
        workers: [
          {
            id: 'worker-1',
            name: '田中',
            slots: [
              {
                date: '2026-02-10',
                startTime: '10:00',
                endTime: '11:00',
                duration: 60,
                availableResourceIds: ['bed-1', 'bed-2'],
              },
            ],
          },
        ],
      }

      const result = mapAvailabilityToCalendar(response)

      expect(result).toEqual([
        {
          id: 'worker-1',
          name: '田中',
          nameEn: undefined,
          slots: [
            {
              startTime: '10:00',
              duration: 60,
              type: 'available',
              data: {
                resourceIds: ['bed-1', 'bed-2'],
                endTime: '11:00',
              },
            },
          ],
        },
      ])
    })

    it('handles multiple workers and slots', () => {
      const response: AvailabilityResponse = {
        date: '2026-02-10',
        serviceId: 'service-shiatsu',
        serviceName: 'Shiatsu',
        serviceDuration: 60,
        workers: [
          {
            id: 'worker-1',
            name: '田中',
            nameEn: 'Tanaka',
            slots: [
              {
                date: '2026-02-10',
                startTime: '10:00',
                endTime: '11:00',
                duration: 60,
                availableResourceIds: ['bed-1'],
              },
              {
                date: '2026-02-10',
                startTime: '14:00',
                endTime: '15:00',
                duration: 60,
                availableResourceIds: ['bed-2'],
              },
            ],
          },
          {
            id: 'worker-2',
            name: '鈴木',
            slots: [
              {
                date: '2026-02-10',
                startTime: '11:00',
                endTime: '12:00',
                duration: 60,
                availableResourceIds: ['bed-1', 'bed-2'],
              },
            ],
          },
        ],
      }

      const result = mapAvailabilityToCalendar(response)

      expect(result).toHaveLength(2)
      expect(result[0].slots).toHaveLength(2)
      expect(result[1].slots).toHaveLength(1)
      expect(result[0].nameEn).toBe('Tanaka')
      expect(result[1].nameEn).toBeUndefined()
    })

    it('handles empty slots array', () => {
      const response: AvailabilityResponse = {
        date: '2026-02-10',
        serviceId: 'service-shiatsu',
        serviceName: 'Shiatsu',
        serviceDuration: 60,
        workers: [
          {
            id: 'worker-1',
            name: '田中',
            slots: [],
          },
        ],
      }

      const result = mapAvailabilityToCalendar(response)

      expect(result).toEqual([
        {
          id: 'worker-1',
          name: '田中',
          nameEn: undefined,
          slots: [],
        },
      ])
    })

    it('preserves all slot data fields', () => {
      const response: AvailabilityResponse = {
        date: '2026-02-10',
        serviceId: 'service-shiatsu',
        serviceName: 'Shiatsu',
        serviceDuration: 60,
        workers: [
          {
            id: 'worker-1',
            name: '田中',
            slots: [
              {
                date: '2026-02-10',
                startTime: '10:00',
                endTime: '11:00',
                duration: 60,
                availableResourceIds: ['bed-1', 'bed-2', 'bed-3'],
              },
            ],
          },
        ],
      }

      const result = mapAvailabilityToCalendar(response)

      expect(result[0].slots[0].data.resourceIds).toEqual(['bed-1', 'bed-2', 'bed-3'])
      expect(result[0].slots[0].data.endTime).toBe('11:00')
    })
  })

  describe('mapAdminBookingsToCalendar', () => {
    it('maps bookings to timeline slots', () => {
      const workers = [
        { id: 'worker-1', name: '田中' },
        { id: 'worker-2', name: '鈴木' },
      ]

      const bookings: AdminBooking[] = [
        {
          id: 'booking-1',
          workerId: 'worker-1',
          startsAt: toZonedTime('2026-02-10', '10:00'),
          endsAt: toZonedTime('2026-02-10', '11:00'),
          customerName: '山田太郎',
          status: 'CONFIRMED',
        },
      ]

      const result = mapAdminBookingsToCalendar(workers, bookings)

      expect(result[0].slots).toEqual([
        {
          startTime: '10:00',
          duration: 540,
          type: 'available',
          data: {},
        },
        {
          startTime: '10:00',
          duration: 60,
          type: 'booked',
          data: {
            bookingId: 'booking-1',
            customer: '山田太郎',
            status: 'CONFIRMED',
          },
        },
      ])
      expect(result[1].slots).toEqual([
        {
          startTime: '10:00',
          duration: 540,
          type: 'available',
          data: {},
        },
      ])
    })

    it('handles worker with no bookings', () => {
      const workers = [
        { id: 'worker-1', name: '田中' },
        { id: 'worker-2', name: '鈴木' },
      ]

      const bookings: AdminBooking[] = [
        {
          id: 'booking-1',
          workerId: 'worker-1',
          startsAt: toZonedTime('2026-02-10', '10:00'),
          endsAt: toZonedTime('2026-02-10', '11:00'),
          customerName: '山田太郎',
          status: 'CONFIRMED',
        },
      ]

      const result = mapAdminBookingsToCalendar(workers, bookings)

      expect(result[1].id).toBe('worker-2')
      expect(result[1].name).toBe('鈴木')
      expect(result[1].slots).toEqual([
        {
          startTime: '10:00',
          duration: 540,
          type: 'available',
          data: {},
        },
      ])
    })

    it('calculates duration correctly for different booking lengths', () => {
      const workers = [{ id: 'worker-1', name: '田中' }]

      const bookings: AdminBooking[] = [
        {
          id: 'booking-1',
          workerId: 'worker-1',
          startsAt: toZonedTime('2026-02-10', '10:00'),
          endsAt: toZonedTime('2026-02-10', '10:30'),
          customerName: '30min',
          status: 'CONFIRMED',
        },
        {
          id: 'booking-2',
          workerId: 'worker-1',
          startsAt: toZonedTime('2026-02-10', '11:00'),
          endsAt: toZonedTime('2026-02-10', '12:00'),
          customerName: '60min',
          status: 'CONFIRMED',
        },
        {
          id: 'booking-3',
          workerId: 'worker-1',
          startsAt: toZonedTime('2026-02-10', '13:00'),
          endsAt: toZonedTime('2026-02-10', '14:30'),
          customerName: '90min',
          status: 'CONFIRMED',
        },
      ]

      const result = mapAdminBookingsToCalendar(workers, bookings)

      expect(result[0].slots[1].duration).toBe(30)
      expect(result[0].slots[2].duration).toBe(60)
      expect(result[0].slots[3].duration).toBe(90)
    })

    it('handles multiple bookings for one worker', () => {
      const workers = [{ id: 'worker-1', name: '田中' }]

      const bookings: AdminBooking[] = [
        {
          id: 'booking-1',
          workerId: 'worker-1',
          startsAt: toZonedTime('2026-02-10', '10:00'),
          endsAt: toZonedTime('2026-02-10', '11:00'),
          customerName: '山田',
          status: 'CONFIRMED',
        },
        {
          id: 'booking-2',
          workerId: 'worker-1',
          startsAt: toZonedTime('2026-02-10', '14:00'),
          endsAt: toZonedTime('2026-02-10', '15:00'),
          customerName: '佐藤',
          status: 'CONFIRMED',
        },
      ]

      const result = mapAdminBookingsToCalendar(workers, bookings)

      expect(result[0].slots).toHaveLength(3)
      expect(result[0].slots[1].data.customer).toBe('山田')
      expect(result[0].slots[2].data.customer).toBe('佐藤')
    })

    it('preserves nameEn field', () => {
      const workers = [
        { id: 'worker-1', name: '田中', nameEn: 'Tanaka' },
      ]

      const bookings: AdminBooking[] = []

      const result = mapAdminBookingsToCalendar(workers, bookings)

      expect(result[0].nameEn).toBe('Tanaka')
    })
  })

  describe('mapAvailabilityWithBookings', () => {
    it('merges available slots and bookings', () => {
      const availabilityResponse: AvailabilityResponse = {
        date: '2026-02-10',
        serviceId: 'service-shiatsu',
        serviceName: 'Shiatsu',
        serviceDuration: 60,
        workers: [
          {
            id: 'worker-1',
            name: '田中',
            slots: [
              {
                date: '2026-02-10',
                startTime: '14:00',
                endTime: '15:00',
                duration: 60,
                availableResourceIds: ['bed-1'],
              },
            ],
          },
        ],
      }

      const bookings: AdminBooking[] = [
        {
          id: 'booking-1',
          workerId: 'worker-1',
          startsAt: new Date('2026-02-10T10:00:00'),
          endsAt: new Date('2026-02-10T11:00:00'),
          customerName: '山田',
          status: 'CONFIRMED',
        },
      ]

      const result = mapAvailabilityWithBookings(availabilityResponse, bookings)

      expect(result[0].slots).toHaveLength(2)
      expect(result[0].slots[0].type).toBe('booked')
      expect(result[0].slots[1].type).toBe('available')
    })

    it('sorts slots by start time', () => {
      const availabilityResponse: AvailabilityResponse = {
        date: '2026-02-10',
        serviceId: 'service-shiatsu',
        serviceName: 'Shiatsu',
        serviceDuration: 60,
        workers: [
          {
            id: 'worker-1',
            name: '田中',
            slots: [
              {
                date: '2026-02-10',
                startTime: '14:00',
                endTime: '15:00',
                duration: 60,
                availableResourceIds: ['bed-1'],
              },
              {
                date: '2026-02-10',
                startTime: '10:00',
                endTime: '11:00',
                duration: 60,
                availableResourceIds: ['bed-2'],
              },
            ],
          },
        ],
      }

      const bookings: AdminBooking[] = [
        {
          id: 'booking-1',
          workerId: 'worker-1',
          startsAt: new Date('2026-02-10T12:00:00'),
          endsAt: new Date('2026-02-10T13:00:00'),
          customerName: '山田',
          status: 'CONFIRMED',
        },
      ]

      const result = mapAvailabilityWithBookings(availabilityResponse, bookings)

      expect(result[0].slots).toHaveLength(3)
      expect(result[0].slots[0].startTime).toBe('10:00')
      expect(result[0].slots[1].startTime).toBe('12:00')
      expect(result[0].slots[2].startTime).toBe('14:00')
    })

    it('handles workers with no bookings', () => {
      const availabilityResponse: AvailabilityResponse = {
        date: '2026-02-10',
        serviceId: 'service-shiatsu',
        serviceName: 'Shiatsu',
        serviceDuration: 60,
        workers: [
          {
            id: 'worker-1',
            name: '田中',
            slots: [
              {
                date: '2026-02-10',
                startTime: '10:00',
                endTime: '11:00',
                duration: 60,
                availableResourceIds: ['bed-1'],
              },
            ],
          },
        ],
      }

      const bookings: AdminBooking[] = []

      const result = mapAvailabilityWithBookings(availabilityResponse, bookings)

      expect(result[0].slots).toHaveLength(1)
      expect(result[0].slots[0].type).toBe('available')
    })

    it('handles workers with no available slots', () => {
      const availabilityResponse: AvailabilityResponse = {
        date: '2026-02-10',
        serviceId: 'service-shiatsu',
        serviceName: 'Shiatsu',
        serviceDuration: 60,
        workers: [
          {
            id: 'worker-1',
            name: '田中',
            slots: [],
          },
        ],
      }

      const bookings: AdminBooking[] = [
        {
          id: 'booking-1',
          workerId: 'worker-1',
          startsAt: new Date('2026-02-10T10:00:00'),
          endsAt: new Date('2026-02-10T11:00:00'),
          customerName: '山田',
          status: 'CONFIRMED',
        },
      ]

      const result = mapAvailabilityWithBookings(availabilityResponse, bookings)

      expect(result[0].slots).toHaveLength(1)
      expect(result[0].slots[0].type).toBe('booked')
    })

    it('includes booking customer in data field', () => {
      const availabilityResponse: AvailabilityResponse = {
        date: '2026-02-10',
        serviceId: 'service-shiatsu',
        serviceName: 'Shiatsu',
        serviceDuration: 60,
        workers: [
          {
            id: 'worker-1',
            name: '田中',
            slots: [],
          },
        ],
      }

      const bookings: AdminBooking[] = [
        {
          id: 'booking-1',
          workerId: 'worker-1',
          startsAt: new Date('2026-02-10T10:00:00'),
          endsAt: new Date('2026-02-10T11:00:00'),
          customerName: '山田太郎',
          status: 'CONFIRMED',
        },
      ]

      const result = mapAvailabilityWithBookings(availabilityResponse, bookings)

      expect(result[0].slots[0].data.customer).toBe('山田太郎')
    })
  })
})
