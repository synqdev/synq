'use client'

/**
 * Calendar Polling Hook
 *
 * Comprehensive SWR polling hook for calendar updates.
 * Supports both user and admin calendar modes.
 * Polls every 10 seconds for real-time availability updates.
 */

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import type { CalendarSlot, CalendarWorker, CalendarBooking } from '@/types/calendar'

/**
 * Generic fetcher function for SWR.
 */
const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch calendar data')
  }
  return res.json()
}

/**
 * User availability API response shape.
 */
interface UserCalendarData {
  date: string
  serviceDuration: number
  workers: Array<{
    id: string
    name: string
    nameEn: string | null
    slots: Array<{
      startTime: string
      endTime: string
      availableResourceIds: string[]
    }>
  }>
}

/**
 * Admin calendar API response shape.
 */
interface AdminCalendarData {
  date: string
  workers: CalendarWorker[]
  bookings: Array<{
    id: string
    startsAt: string
    endsAt: string
    workerId: string
    resourceId: string
    serviceId: string
    customerName: string
    customerEmail: string
    serviceName: string
    status: 'CONFIRMED' | 'CANCELLED' | 'NOSHOW'
  }>
}

/**
 * Options for the calendar polling hook.
 */
interface UseCalendarPollingOptions {
  /** Date to fetch availability for (YYYY-MM-DD format) */
  date: string
  /** Calendar mode: 'user' for public availability, 'admin' for detailed bookings */
  mode: 'user' | 'admin'
  /** Polling interval in milliseconds (default: 10000 = 10 seconds) */
  pollingInterval?: number
}

/**
 * Return value for the calendar polling hook.
 */
interface CalendarPollingResult {
  workers: CalendarWorker[]
  slots: CalendarSlot[]
  bookings: CalendarBooking[]
  date: string
  serviceDuration: number
  error: Error | undefined
  isLoading: boolean
  lastUpdated: Date | null
  refresh: () => void
}

/**
 * Hook for polling calendar data with SWR.
 *
 * Features:
 * - Polls every 10 seconds (configurable)
 * - Revalidates on window focus
 * - Revalidates on network reconnect
 * - Pauses polling when tab is hidden
 * - Dedupes rapid requests
 *
 * @param options - Configuration options
 * @returns Calendar data with loading/error states
 *
 * @example
 * // User calendar
 * const { workers, slots, isLoading } = useCalendarPolling({
 *   date: '2024-06-15',
 *   mode: 'user'
 * })
 *
 * @example
 * // Admin calendar with bookings
 * const { workers, bookings, lastUpdated } = useCalendarPolling({
 *   date: '2024-06-15',
 *   mode: 'admin'
 * })
 */
export function useCalendarPolling({
  date,
  mode,
  pollingInterval = 10000, // Default 10 seconds
}: UseCalendarPollingOptions): CalendarPollingResult {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const endpoint =
    mode === 'user'
      ? `/api/availability?date=${date}`
      : `/api/admin/calendar?date=${date}`

  // Use different SWR keys for user vs admin to avoid cache conflicts
  const swrKey = `${mode}:${endpoint}`

  const {
    data: rawData,
    error,
    isLoading,
    mutate,
  } = useSWR<UserCalendarData | AdminCalendarData>(
    swrKey,
    () => fetcher(endpoint),
    {
      refreshInterval: pollingInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
      // Pause polling when tab not visible
      refreshWhenHidden: false,
      // Ensure fresh data on mount
      revalidateOnMount: true,
    }
  )

  // Update lastUpdated timestamp when data changes
  useEffect(() => {
    if (rawData) {
      setLastUpdated(new Date())
    }
  }, [rawData])

  // Transform data based on mode
  if (mode === 'user') {
    const data = rawData as UserCalendarData | undefined

    const workers: CalendarWorker[] = (data?.workers ?? []).map((w) => ({
      id: w.id,
      name: w.name,
      nameEn: w.nameEn ?? undefined,
    }))

    const slots: CalendarSlot[] = (data?.workers ?? []).flatMap((worker) =>
      worker.slots.map((slot) => ({
        time: slot.startTime,
        workerId: worker.id,
        resourceId: slot.availableResourceIds[0],
        isAvailable: slot.availableResourceIds.length > 0,
      }))
    )

    return {
      workers,
      slots,
      bookings: [],
      date: data?.date ?? date,
      serviceDuration: data?.serviceDuration ?? 60,
      error,
      isLoading,
      lastUpdated,
      refresh: () => mutate(),
    }
  }

  // Admin mode
  const data = rawData as AdminCalendarData | undefined

  const workers: CalendarWorker[] = data?.workers ?? []

  const bookings: CalendarBooking[] = (data?.bookings ?? []).map((b) => ({
    id: b.id,
    startsAt: new Date(b.startsAt),
    endsAt: new Date(b.endsAt),
    workerId: b.workerId,
    resourceId: b.resourceId,
    serviceId: b.serviceId,
    customerName: b.customerName,
    serviceName: b.serviceName,
    status: b.status,
  }))

  // Convert bookings to slots for admin calendar display
  const slots: CalendarSlot[] = bookings.map((booking) => ({
    time: booking.startsAt.toISOString().slice(11, 16), // Extract HH:MM
    workerId: booking.workerId,
    resourceId: booking.resourceId,
    isAvailable: false,
    booking,
  }))

  return {
    workers,
    slots,
    bookings,
    date: data?.date ?? date,
    serviceDuration: 60, // Admin doesn't need this
    error,
    isLoading,
    lastUpdated,
    refresh: () => mutate(),
  }
}

/**
 * Hook for adaptive polling based on user activity.
 *
 * Increases polling frequency when user is active,
 * decreases when inactive to reduce server load.
 *
 * @param baseInterval - Base polling interval in ms (default: 10000)
 * @returns Current polling interval based on activity
 *
 * @example
 * const pollingInterval = useAdaptivePolling(10000)
 * const { workers } = useCalendarPolling({
 *   date,
 *   mode: 'user',
 *   pollingInterval
 * })
 */
export function useAdaptivePolling(baseInterval: number = 10000): number {
  const [interval, setIntervalState] = useState(baseInterval)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    const handleActivity = () => {
      setIntervalState(baseInterval) // Fast polling on activity
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setIntervalState(baseInterval * 3) // Slow down after 30s inactivity
      }, 30000)
    }

    // Set initial activity
    handleActivity()

    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('click', handleActivity)
    window.addEventListener('scroll', handleActivity)

    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('scroll', handleActivity)
      clearTimeout(timeoutId)
    }
  }, [baseInterval])

  return interval
}
