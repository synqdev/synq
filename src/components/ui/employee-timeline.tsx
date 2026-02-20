'use client'

import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import { EmployeeTimelineBar, type EmployeeTimelineBarData } from './employee-timeline-bar'

export interface EmployeeTimelinePerson {
  id: string
  name: string
  avatarInitials: string
  avatarSrc?: string
}

export interface EmployeeTimelineProps {
  employee: EmployeeTimelinePerson
  segments: EmployeeTimelineBarData[]
  onSegmentsChange?: (segments: EmployeeTimelineBarData[]) => void
  startHour?: number
  endHour?: number
  snapMinutes?: number
  rowHeight?: number
  allowOverlap?: boolean
  className?: string
}

const DEFAULT_ROW_HEIGHT = 84
const AVATAR_WIDTH = 78

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const minutesToPercent = (value: number, startMinute: number, totalMinutes: number) =>
  ((value - startMinute) / totalMinutes) * 100
const intervalsOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && bStart < aEnd

export function EmployeeTimeline({
  employee,
  segments,
  onSegmentsChange,
  startHour = 10,
  endHour = 18,
  snapMinutes = 60,
  rowHeight = DEFAULT_ROW_HEIGHT,
  allowOverlap = false,
  className = '',
}: EmployeeTimelineProps) {
  const [localSegments, setLocalSegments] = useState<EmployeeTimelineBarData[]>(segments)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const effectiveSegments = onSegmentsChange ? segments : localSegments
  const startMinute = startHour * 60
  const endMinute = endHour * 60
  const totalMinutes = endMinute - startMinute

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>, itemId: string) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const dragged = effectiveSegments.find((item) => item.id === itemId)
    if (!dragged) return

    const trackWidth = event.currentTarget.parentElement?.clientWidth ?? 0
    if (trackWidth <= 0) return

    const startX = event.clientX
    const originalStart = dragged.startMinute

    setDraggingId(itemId)

    const onMove = (moveEvent: PointerEvent) => {
      const minuteOffsetRaw = ((moveEvent.clientX - startX) / trackWidth) * totalMinutes
      const minuteOffset = Math.round(minuteOffsetRaw / snapMinutes) * snapMinutes
      const boundedStart = clamp(
        originalStart + minuteOffset,
        startMinute,
        endMinute - dragged.durationMinute
      )

      if (!allowOverlap) {
        const candidateEnd = boundedStart + dragged.durationMinute
        const hasOverlap = effectiveSegments.some((item) => {
          if (item.id === itemId) return false
          const itemEnd = item.startMinute + item.durationMinute
          return intervalsOverlap(boundedStart, candidateEnd, item.startMinute, itemEnd)
        })
        if (hasOverlap) return
      }

      const next = effectiveSegments.map((item) =>
        item.id === itemId ? { ...item, startMinute: boundedStart } : item
      )

      if (onSegmentsChange) {
        onSegmentsChange(next)
      } else {
        setLocalSegments(next)
      }
    }

    const onUp = () => {
      setDraggingId(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div className={`relative ${className}`} style={{ height: `${rowHeight}px` }}>
      <div className="absolute inset-y-0 right-0 rounded-[24px] bg-[#c3c9cd]" style={{ left: `${AVATAR_WIDTH}px` }} />

      <div className="absolute left-0 top-1/2 z-30 -translate-y-1/2">
        <div className="h-[78px] w-[78px] overflow-hidden rounded-[24px] border border-white/70 bg-[#f5f6f8] text-[#4f5962]">
          <div className="h-[56px] bg-gradient-to-br from-[#f7f7f7] to-[#dadde3]">
            {employee.avatarSrc ? (
              <img src={employee.avatarSrc} alt={employee.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-3xl font-semibold">{employee.avatarInitials}</div>
            )}
          </div>
          <div className="bg-white/78 px-1 text-center text-[14px] font-semibold leading-5 text-[#5b6268]">{employee.name}</div>
        </div>
      </div>

      <div className="absolute inset-y-0 right-0" style={{ left: `${AVATAR_WIDTH}px` }}>
        {effectiveSegments.map((item) => {
          const left = minutesToPercent(item.startMinute, startMinute, totalMinutes)
          const width = (item.durationMinute / totalMinutes) * 100

          return (
            <div
              key={item.id}
              className={`absolute inset-y-0 ${draggingId === item.id ? 'z-50' : 'z-30'}`}
              style={{ left: `${left}%`, width: `${width}%` }}
              onPointerDown={(event) => onPointerDown(event, item.id)}
            >
              <EmployeeTimelineBar
                item={item}
                className={draggingId === item.id ? 'cursor-grabbing shadow-xl' : 'cursor-grab'}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
