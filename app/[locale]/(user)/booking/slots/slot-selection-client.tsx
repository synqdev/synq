'use client'

/**
 * Slot Selection Client Component
 *
 * Interactive wrapper for EmployeeTimeline in user mode.
 * Handles slot clicks and navigation to confirmation page.
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { EmployeeTimeline } from '@/components/calendar/employee-timeline'
import { Button } from '@/components/ui/button'
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
 * - Clicking a slot selects it (Select + Submit pattern)
 * - Next button proceeds to confirmation page
 * - No availability shows helpful message
 */
export function SlotSelectionClient({
  workers,
  serviceId,
  date,
  locale,
}: SlotSelectionClientProps) {
  const router = useRouter()
  const tBooking = useTranslations('booking')
  const tCommon = useTranslations('common')
  const [selectedSlot, setSelectedSlot] = useState<TimelineSlot | null>(null)
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)

  const handleSlotClick = (slot: TimelineSlot, workerId: string) => {
    console.log('handleSlotClick called:', { slot, workerId })
    // Toggle selection if clicking the same slot, otherwise select new
    if (selectedSlot?.startTime === slot.startTime && selectedWorkerId === workerId) {
      console.log('Deselecting slot')
      setSelectedSlot(null)
      setSelectedWorkerId(null)
    } else {
      console.log('Selecting slot')
      setSelectedSlot(slot)
      setSelectedWorkerId(workerId)
    }
  }

  const handleNext = () => {
    if (!selectedSlot || !selectedWorkerId) return

    const resourceId = selectedSlot.data?.resourceIds?.[0]
    if (!resourceId) {
      console.error('No resource available for slot')
      return
    }

    // Navigate to preview page with all booking details
    const params = new URLSearchParams({
      serviceId,
      date,
      workerId: selectedWorkerId,
      time: selectedSlot.startTime,
      resourceId,
    })

    router.push(`/${locale}/booking/preview?${params.toString()}`)
  }

  // Derive display time range from actual slot data
  const timeRange = useMemo(() => {
    let earliest = '10:00'
    let latest = '18:00'
    for (const worker of workers) {
      for (const slot of worker.slots) {
        if (slot.startTime < earliest) earliest = slot.startTime
        const endMinutes = slot.startTime.split(':').map(Number).reduce((h, m) => h * 60 + m) + slot.duration
        const endHour = String(Math.floor(endMinutes / 60)).padStart(2, '0')
        const endMin = String(endMinutes % 60).padStart(2, '0')
        const endTime = `${endHour}:${endMin}`
        if (endTime > latest) latest = endTime
      }
    }
    return { start: earliest, end: latest }
  }, [workers])

  // Check if there are any available slots
  const hasAvailableSlots = workers.some(worker => worker.slots.length > 0)

  if (!hasAvailableSlots) {
    return (
      <div className="text-center py-12" data-testid="slots-empty">
        <p className="text-gray-500 text-lg">
          {tBooking('noSlots')}
        </p>
        <p className="text-gray-400 mt-2">
          {tBooking('selectDifferentDate')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <EmployeeTimeline
        workers={workers}
        mode="user"
        selectedSlot={selectedSlot}
        selectedWorkerId={selectedWorkerId}
        timeRange={timeRange}
        onSlotClick={handleSlotClick}
        className="min-h-[400px]"
      />

      <div className="flex justify-between pt-4 border-t border-gray-100">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="min-w-[120px]"
        >
          {tCommon('back')}
        </Button>
        <Button
          onClick={handleNext}
          disabled={!selectedSlot}
          className="min-w-[120px]"
        >
          {tCommon('next')}
        </Button>
      </div>
    </div>
  )
}
