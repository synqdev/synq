'use client'

/**
 * Slot Selection Client Component
 *
 * Interactive wrapper for EmployeeTimeline in user mode.
 * Handles slot clicks and navigation to confirmation page.
 */

import { useRouter } from 'next/navigation'
import { EmployeeTimeline } from '@/components/calendar/employee-timeline'
import type { TimelineWorker, TimelineSlot } from '@/components/calendar/employee-timeline'

interface SlotSelectionClientProps {
  workers: TimelineWorker[]
  serviceId: string
  date: string
  locale: string
}

/**
 * Slot selection with EmployeeTimeline in user mode.
 *
 * Features:
 * - Green available slots are clickable
 * - Clicking a slot navigates to confirmation page
 * - No availability shows helpful message
 */
export function SlotSelectionClient({
  workers,
  serviceId,
  date,
  locale,
}: SlotSelectionClientProps) {
  const router = useRouter()

  const handleSlotClick = (slot: TimelineSlot, workerId: string) => {
    const resourceId = slot.data?.resourceIds?.[0]
    if (!resourceId) {
      console.error('No resource available for slot')
      return
    }

    // Navigate to confirmation page with all booking details
    const params = new URLSearchParams({
      serviceId,
      date,
      workerId,
      time: slot.startTime,
      resourceId,
    })

    router.push(`/${locale}/booking/confirm?${params.toString()}`)
  }

  // Check if there are any available slots
  const hasAvailableSlots = workers.some(worker => worker.slots.length > 0)

  if (!hasAvailableSlots) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          {locale === 'ja' ? 'この日は空きがありません' : 'No availability on this date'}
        </p>
        <p className="text-gray-400 mt-2">
          {locale === 'ja' ? '別の日付を選択してください' : 'Please select a different date'}
        </p>
      </div>
    )
  }

  return (
    <EmployeeTimeline
      workers={workers}
      timeRange={{ start: '10:00', end: '19:00' }}
      className="min-h-[400px]"
    />
  )
}
