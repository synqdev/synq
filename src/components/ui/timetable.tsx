'use client'

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { EmployeeTimelineBar, type EmployeeTimelineBarData } from './employee-timeline-bar'

export interface TimetableTab {
  id: string
  label: string
  icon?: ReactNode
}

export interface TimetableEmployee {
  id: string
  name: string
  avatarInitials: string
  avatarSrc?: string
  segments: EmployeeTimelineBarData[]
}

export type TimetableStaffRow = Omit<TimetableEmployee, 'segments'>

export interface TimePassedOverlayProps {
  startMinute: number
  endMinute: number
  currentMinute: number
  leftOffsetPx?: number
  rightOffsetPx?: number
  className?: string
  style?: CSSProperties
}

export interface TimetableProps {
  tabs: TimetableTab[]
  activeTabId: string
  onTabChange?: (id: string) => void
  employees: TimetableEmployee[]
  onEmployeesChange?: (employees: TimetableEmployee[]) => void
  onTimeSlotClick?: (payload: { rowId: string; startMinute: number }) => void
  onBarDragEnd?: (payload: {
    bar: EmployeeTimelineBarData
    previousRowId: string
    previousStartMinute: number
  }) => void
  startHour?: number
  endHour?: number
  currentTimeLabel?: string
  currentMinute?: number
  rowHeight?: number
  snapMinutes?: number
  allowOverlap?: boolean
  customBody?: ReactNode
  showFrame?: boolean
  className?: string
}

const DEFAULT_ROW_HEIGHT = 84
const AVATAR_WIDTH = 78

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const minutesToPercent = (value: number, startMinute: number, totalMinutes: number) =>
  ((value - startMinute) / totalMinutes) * 100
const intervalsOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && bStart < aEnd

export function TimePassedOverlay({
  startMinute,
  endMinute,
  currentMinute,
  leftOffsetPx = 0,
  rightOffsetPx = 0,
  className = '',
  style,
}: TimePassedOverlayProps) {
  const total = endMinute - startMinute
  const overlayWidth = clamp(minutesToPercent(currentMinute, startMinute, total), 0, 100)
  const usableWidth = `calc(100% - ${leftOffsetPx + rightOffsetPx}px)`

  return (
    <div
      className={`pointer-events-none absolute inset-y-0 left-0 bg-[#8a8f95]/46 ${className}`}
      style={{ ...style, left: `${leftOffsetPx}px`, width: `calc(${usableWidth} * ${overlayWidth / 100})` }}
      aria-hidden
    />
  )
}

export function Timetable({
  tabs,
  activeTabId,
  onTabChange,
  employees,
  onEmployeesChange,
  onTimeSlotClick,
  onBarDragEnd,
  startHour = 10,
  endHour = 18,
  currentTimeLabel = '12:24',
  currentMinute = 12 * 60 + 24,
  rowHeight = DEFAULT_ROW_HEIGHT,
  snapMinutes = 60,
  allowOverlap = false,
  customBody,
  showFrame = true,
  className = '',
}: TimetableProps) {
  const [localEmployees, setLocalEmployees] = useState<TimetableEmployee[]>(employees)
  const [selectedMoveBarId, setSelectedMoveBarId] = useState<string | null>(null)
  const [moveHover, setMoveHover] = useState<{ rowId: string; startMinute: number; valid: boolean } | null>(null)

  const effectiveEmployees = onEmployeesChange ? employees : localEmployees
  const startMinute = startHour * 60
  const endMinute = endHour * 60
  const totalMinutes = endMinute - startMinute
  const timelineContentHeight = effectiveEmployees.length * rowHeight
  const currentTimeLeft = clamp(minutesToPercent(currentMinute, startMinute, totalMinutes), 0, 100)

  const hourMarkers = useMemo(() => {
    const list: number[] = []
    for (let h = startHour; h <= endHour; h += 1) {
      list.push(h)
    }
    return list
  }, [startHour, endHour])

  const slotStarts = useMemo(() => {
    const slots: number[] = []
    for (let minute = startMinute; minute < endMinute; minute += snapMinutes) {
      slots.push(minute)
    }
    return slots
  }, [startMinute, endMinute, snapMinutes])

  const selectedMoveBar = selectedMoveBarId
    ? effectiveEmployees.flatMap((employee) => employee.segments).find((segment) => segment.id === selectedMoveBarId) ?? null
    : null

  const canPlaceBar = (bar: EmployeeTimelineBarData, rowId: string, candidateStartMinute: number) => {
    const candidateEndMinute = candidateStartMinute + bar.durationMinute
    if (candidateStartMinute < startMinute || candidateEndMinute > endMinute) return false
    if (allowOverlap) return true
    const row = effectiveEmployees.find((employee) => employee.id === rowId)
    if (!row) return false
    return !row.segments.some((item) => {
      if (item.id === bar.id) return false
      const itemEndMinute = item.startMinute + item.durationMinute
      return intervalsOverlap(candidateStartMinute, candidateEndMinute, item.startMinute, itemEndMinute)
    })
  }

  const handleSlotClick = (rowId: string, slotStart: number, segments: EmployeeTimelineBarData[]) => {
    if (selectedMoveBar) {
      const valid = canPlaceBar(selectedMoveBar, rowId, slotStart)
      if (!valid) return
      if (selectedMoveBar.rowId === rowId && selectedMoveBar.startMinute === slotStart) {
        setSelectedMoveBarId(null)
        setMoveHover(null)
        return
      }
      onBarDragEnd?.({
        bar: { ...selectedMoveBar, rowId, startMinute: slotStart },
        previousRowId: selectedMoveBar.rowId,
        previousStartMinute: selectedMoveBar.startMinute,
      })
      setSelectedMoveBarId(null)
      setMoveHover(null)
      return
    }

    if (!onTimeSlotClick) return

    const slotEnd = slotStart + snapMinutes
    const isOccupied = segments.some((segment) => {
      const segmentEnd = segment.startMinute + segment.durationMinute
      return intervalsOverlap(slotStart, slotEnd, segment.startMinute, segmentEnd)
    })
    if (isOccupied) return

    onTimeSlotClick({ rowId, startMinute: slotStart })
  }

  const handleSlotHover = (rowId: string, slotStart: number) => {
    if (!selectedMoveBar) return
    setMoveHover({
      rowId,
      startMinute: slotStart,
      valid: canPlaceBar(selectedMoveBar, rowId, slotStart),
    })
  }

  const handleBarClick = (bar: EmployeeTimelineBarData) => {
    if (!onBarDragEnd || bar.type !== 'booking') return
    setSelectedMoveBarId((current) => (current === bar.id ? null : bar.id))
    setMoveHover(null)
  }

  return (
    <section
      className={`relative overflow-hidden text-[#eef2f4] font-['Arial_Narrow','Franklin_Gothic_Medium','sans-serif'] ${
        showFrame ? 'rounded-[32px] border border-[#b4b0a7] bg-[#c9c6bd] p-7' : 'p-0'
      } flex h-full flex-col ${className}`}
    >
      <div className="relative flex w-full gap-[1px]">
        {tabs.map((tab) => {
          const active = tab.id === activeTabId
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange?.(tab.id)}
              className={`flex h-[44px] flex-1 items-center justify-center gap-2 rounded-t-2xl px-3 text-[16px] font-semibold transition ${
                active ? 'bg-[#84a2aa] text-white' : 'bg-[#a4a3a3] text-white/95 hover:bg-[#9a9a9a]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="relative flex-1 rounded-[22px] rounded-tl-none rounded-tr-none bg-[#7d9ea7]/88 p-3">
        <div className="relative flex h-full flex-col rounded-[18px] rounded-tl-none rounded-tr-none border border-white/15 bg-[#78949c]/60 p-1">
          <div className="relative h-[50px] border-b border-white/20">
            <div className="absolute top-[6px] text-[20px] font-semibold text-white/78" style={{ left: `${AVATAR_WIDTH}px` }}>{`${String(startHour).padStart(2, '0')}:00`}</div>
            <div
              className="absolute top-[6px] text-[20px] font-semibold text-white/78"
              style={{ left: `calc(${AVATAR_WIDTH}px + (100% - ${AVATAR_WIDTH + 16}px) * ${currentTimeLeft / 100})`, transform: 'translateX(-50%)' }}
            >
              {currentTimeLabel}
            </div>
            <div className="absolute right-4 top-[6px] text-[20px] font-semibold text-white/82">{`${String(endHour).padStart(2, '0')}:00`}</div>
          </div>

          <div className="relative min-h-0 flex-1" style={{ paddingBottom: customBody ? 0 : 'max(88px, 8vh)' }}>
            {customBody ? (
              <div className="relative z-10 h-full">{customBody}</div>
            ) : (
              <>
            <div className="absolute top-0 bottom-0 right-4 z-0" style={{ left: `${AVATAR_WIDTH}px` }}>
              {hourMarkers.map((hour) => {
                const left = minutesToPercent(hour * 60, startMinute, totalMinutes)
                return (
                  <div
                    key={hour}
                    className="absolute top-0 h-full w-px bg-white/50"
                    style={{ left: `${left}%` }}
                  />
                )
              })}
            </div>

            <div className="relative z-10">
              {effectiveEmployees.map((member) => (
                <div key={member.id} className="relative border-b border-white/30 last:border-b-0" style={{ height: `${rowHeight}px` }}>
                  <div className="absolute inset-y-0 right-4 rounded-[24px] bg-[#c3c9cd]" style={{ left: `${AVATAR_WIDTH}px` }} />
                  <div className="absolute left-3 top-1/2 z-30 -translate-y-1/2">
                    <div className="h-[78px] w-[78px] overflow-hidden rounded-[24px] border border-white/70 bg-[#f5f6f8] text-[#4f5962]">
                      <div className="h-[56px] bg-gradient-to-br from-[#f7f7f7] to-[#dadde3]">
                        {member.avatarSrc ? (
                          <img src={member.avatarSrc} alt={member.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-3xl font-semibold">{member.avatarInitials}</div>
                        )}
                      </div>
                      <div className="bg-white/78 px-1 text-center text-[14px] font-semibold leading-5 text-[#5b6268]">{member.name}</div>
                    </div>
                  </div>

                  <div
                    className="absolute inset-y-0 right-4"
                    style={{ left: `${AVATAR_WIDTH}px` }}
                    onMouseLeave={() => setMoveHover(null)}
                  >
                    {slotStarts.map((slotStart) => {
                      const slotLeft = minutesToPercent(slotStart, startMinute, totalMinutes)
                      const slotWidth = (snapMinutes / totalMinutes) * 100

                      return (
                        <button
                          key={`${member.id}-${slotStart}`}
                          type="button"
                          aria-label={`Create at ${String(Math.floor(slotStart / 60)).padStart(2, '0')}:${String(
                            slotStart % 60
                          ).padStart(2, '0')} for ${member.name}`}
                          className="absolute inset-y-0 z-20 rounded-[20px] border border-transparent bg-transparent transition hover:border-white/20"
                          style={{ left: `${slotLeft}%`, width: `${slotWidth}%` }}
                          onClick={() => handleSlotClick(member.id, slotStart, member.segments)}
                          onMouseEnter={() => handleSlotHover(member.id, slotStart)}
                          onFocus={() => handleSlotHover(member.id, slotStart)}
                        />
                      )
                    })}

                    {selectedMoveBar && moveHover && moveHover.rowId === member.id ? (
                      <div
                        className={`pointer-events-none absolute inset-y-0 z-40 rounded-[24px] border ${
                          moveHover.valid ? 'border-white/70 bg-white/22' : 'border-[#ffb4b4]/80 bg-[#d88989]/35'
                        }`}
                        style={{
                          left: `${minutesToPercent(moveHover.startMinute, startMinute, totalMinutes)}%`,
                          width: `${(selectedMoveBar.durationMinute / totalMinutes) * 100}%`,
                        }}
                      />
                    ) : null}

                    {member.segments.map((item) => {
                      const left = minutesToPercent(item.startMinute, startMinute, totalMinutes)
                      const width = (item.durationMinute / totalMinutes) * 100

                      return (
                        <div
                          key={item.id}
                          data-booking-segment="true"
                          className={`absolute inset-y-0 ${selectedMoveBarId === item.id ? 'z-50' : 'z-30'}`}
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                          }}
                          onClick={() => handleBarClick(item)}
                        >
                          <EmployeeTimelineBar
                            item={item}
                            className={selectedMoveBarId === item.id ? 'cursor-pointer shadow-xl ring-2 ring-white/70' : 'cursor-pointer'}
                          />
                          {selectedMoveBarId === item.id ? (
                            <div className="pointer-events-none absolute inset-0 rounded-[24px] border border-white/70 bg-white/18 animate-pulse" />
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <TimePassedOverlay
              startMinute={startMinute}
              endMinute={endMinute}
              currentMinute={currentMinute}
              leftOffsetPx={AVATAR_WIDTH}
              rightOffsetPx={16}
              className="z-20 rounded-r-[24px]"
              style={{ height: `${timelineContentHeight}px` }}
            />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
