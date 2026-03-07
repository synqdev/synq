'use client'

import { useMemo, type ReactNode } from 'react'
import {
  EmployeeTimelineBar,
  SettingsBar,
  Timetable,
  TimePassedOverlay as UITimePassedOverlay,
  type EmployeeTimelineBarData,
  type SettingsBarProps,
  type SettingsItem,
  type TimePassedOverlayProps as UITimePassedOverlayProps,
  type TimetableEmployee,
  type TimetableTab,
} from '@/components/ui'

type IconName =
  | 'home'
  | 'calendar'
  | 'user'
  | 'client'
  | 'services'
  | 'analytics'
  | 'settings'
  | 'refresh'
  | 'logout'

export interface TopTabItem {
  id: string
  label: string
  icon: IconName
}

export interface SideActionItem {
  id: string
  icon: IconName
}

export interface TimelineStaff {
  id: string
  name: string
  avatarInitials: string
  avatarSrc?: string
}

export type TimelineBarType = 'booking' | 'open' | 'blocked'

export interface TimelineBarItem {
  id: string
  rowId: string
  startMinute: number
  durationMinute: number
  title: string
  subtitle?: string
  type: TimelineBarType
}

export interface SettingsRailProps {
  items: SideActionItem[]
  activeItemId?: string
  onItemClick?: (id: string) => void
  className?: string
}

export interface TimelineBarProps {
  item: TimelineBarItem
  className?: string
}

export interface TimePassedOverlayProps extends UITimePassedOverlayProps {}

export interface TimetableWithTabsProps {
  tabs: TopTabItem[]
  activeTabId: string
  onTabChange?: (id: string) => void
  sideActions?: SideActionItem[]
  activeSideActionId?: string
  onSideActionChange?: (id: string) => void
  staff: TimelineStaff[]
  bars: TimelineBarItem[]
  onBarsChange?: (bars: TimelineBarItem[]) => void
  onTimeSlotClick?: (payload: { rowId: string; startMinute: number }) => void
  onBarDragEnd?: (payload: {
    bar: TimelineBarItem
    previousRowId: string
    previousStartMinute: number
  }) => void
  panelContent?: ReactNode
  startHour?: number
  endHour?: number
  currentTimeLabel?: string
  currentMinute?: number
  rowHeight?: number
  className?: string
}

function iconFor(name: IconName, className = 'h-6 w-6') {
  const common = { className, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true }
  switch (name) {
    case 'home':
      return <svg {...common}><path d="M12 3 2.5 10.8h2.2V21h6.1v-6.3h2.4V21h6.1V10.8h2.2Z" /></svg>
    case 'calendar':
      return <svg {...common}><path d="M7 2.5a1 1 0 0 1 1 1V5h8V3.5a1 1 0 1 1 2 0V5h1.2A2.8 2.8 0 0 1 22 7.8v11.4A2.8 2.8 0 0 1 19.2 22H4.8A2.8 2.8 0 0 1 2 19.2V7.8A2.8 2.8 0 0 1 4.8 5H6V3.5a1 1 0 0 1 1-1Zm13 8H4v8.7c0 .6.4 1 1 1h14c.6 0 1-.4 1-1Z" /></svg>
    case 'user':
      return <svg {...common}><path d="M12 3.2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 10.8c4.9 0 8.6 2.8 9.7 7.1.2.7-.3 1.3-1 1.3H3.3c-.7 0-1.2-.6-1-1.3C3.4 16.8 7.1 14 12 14Z" /></svg>
    case 'client':
      return <svg {...common}><path d="M12 2.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10ZM4 21.5a8 8 0 0 1 16 0z" /></svg>
    case 'services':
      return <svg {...common}><path d="M8 4.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm8.5 2a2 2 0 1 1 0 4h-.8l-1.3 2.2h5.9a1 1 0 0 1 0 2H13l-1.8 3H4a1 1 0 1 1 0-2h5.9l1-1.8-1.7-2.8H4a1 1 0 1 1 0-2h6.2l1.4 2.4 1.6-2.8Z" /></svg>
    case 'analytics':
      return <svg {...common}><path d="M3 20.5h18v1.5H3zM5 11h3v8H5zm5-5h3v13h-3zm5 3h3v10h-3z" /></svg>
    case 'settings':
      return <svg {...common}><path d="M10.6 2h2.8l.5 2a8 8 0 0 1 1.8.8l1.8-1.1 2 2-1.1 1.8c.3.6.6 1.2.8 1.8l2 .5v2.8l-2 .5a8 8 0 0 1-.8 1.8l1.1 1.8-2 2-1.8-1.1a8 8 0 0 1-1.8.8l-.5 2h-2.8l-.5-2a8 8 0 0 1-1.8-.8L6 19.8l-2-2 1.1-1.8a8 8 0 0 1-.8-1.8l-2-.5V10.9l2-.5c.2-.6.5-1.2.8-1.8L4 6.8l2-2 1.8 1.1c.6-.3 1.2-.6 1.8-.8Zm1.4 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /></svg>
    case 'refresh':
      return <svg {...common}><path d="M2 12a10 10 0 0 1 16.6-7.5l1.9-1.9V9h-6.4l2.3-2.3A7 7 0 1 0 19 12a1 1 0 1 1 2 0 9 9 0 1 1-18 0Z" /></svg>
    case 'logout':
      return <svg {...common}><path d="M10 3a1 1 0 0 1 0 2H6v14h4a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm6.3 4.3a1 1 0 0 1 1.4 0l3.6 3.6a1 1 0 0 1 0 1.4l-3.6 3.6a1 1 0 1 1-1.4-1.4l1.9-1.9H9a1 1 0 1 1 0-2h9.2l-1.9-1.9a1 1 0 0 1 0-1.4Z" /></svg>
  }
}

export function SettingsRail({ items, activeItemId, onItemClick, className = '' }: SettingsRailProps) {
  const mappedItems: SettingsItem[] = useMemo(
    () => items.map((item) => ({ id: item.id, label: item.id, icon: iconFor(item.icon, 'h-8 w-8') })),
    [items]
  )

  const handleNavigate: SettingsBarProps['onNavigate'] = (item) => {
    onItemClick?.(item.id)
  }

  return (
    <SettingsBar
      items={mappedItems}
      activeItemId={activeItemId}
      onNavigate={handleNavigate}
      distribution="spread"
      className={className}
    />
  )
}

export function TimelineBar({ item, className = '' }: TimelineBarProps) {
  const mappedItem: EmployeeTimelineBarData = item
  return <EmployeeTimelineBar item={mappedItem} className={className} />
}

export function TimePassedOverlay(props: TimePassedOverlayProps) {
  return <UITimePassedOverlay {...props} />
}

export function TimetableWithTabs({
  tabs,
  activeTabId,
  onTabChange,
  sideActions,
  activeSideActionId,
  onSideActionChange,
  staff,
  bars,
  onBarsChange,
  onTimeSlotClick,
  onBarDragEnd,
  panelContent,
  startHour = 10,
  endHour = 18,
  currentTimeLabel = '12:24',
  currentMinute = 12 * 60 + 24,
  rowHeight = 84,
  className = '',
}: TimetableWithTabsProps) {
  const mappedTabs: TimetableTab[] = useMemo(
    () => tabs.map((tab) => ({ id: tab.id, label: tab.label, icon: iconFor(tab.icon, 'h-5 w-5') })),
    [tabs]
  )

  const mappedEmployees: TimetableEmployee[] = useMemo(
    () =>
      staff.map((member) => ({
        ...member,
        segments: bars.filter((bar) => bar.rowId === member.id),
      })),
    [staff, bars]
  )

  const handleEmployeesChange = (employees: TimetableEmployee[]) => {
    if (!onBarsChange) return
    const nextBars = employees
      .flatMap((employee) => employee.segments.map((segment) => ({ ...segment, rowId: employee.id })))
      .sort((a, b) => a.startMinute - b.startMinute)
    onBarsChange(nextBars)
  }

  return (
    <div className={`relative flex h-full min-h-0 items-start gap-[2px] ${className}`}>
      {sideActions && sideActions.length > 0 && (
        <SettingsRail
          items={sideActions}
          activeItemId={activeSideActionId}
          onItemClick={onSideActionChange}
          className="mt-[44px] h-[calc(100%-44px)] w-[74px] rounded-[28px] pt-5 pb-5"
        />
      )}

      <Timetable
        tabs={mappedTabs}
        activeTabId={activeTabId}
        onTabChange={onTabChange}
        employees={mappedEmployees}
        onEmployeesChange={onBarsChange ? handleEmployeesChange : undefined}
        onTimeSlotClick={onTimeSlotClick}
        onBarDragEnd={onBarDragEnd}
        customBody={panelContent}
        startHour={startHour}
        endHour={endHour}
        currentTimeLabel={currentTimeLabel}
        currentMinute={currentMinute}
        rowHeight={rowHeight}
        snapMinutes={60}
        allowOverlap={false}
        showFrame={false}
        className="h-full min-h-0 flex-1"
      />
    </div>
  )
}

export type { EmployeeTimelineBarData as TimelineBarData }
export type { TimetableEmployee }
