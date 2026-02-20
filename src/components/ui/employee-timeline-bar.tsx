'use client'

export type EmployeeTimelineBarType = 'booking' | 'open' | 'blocked'

export interface EmployeeTimelineBarData {
  id: string
  rowId: string
  startMinute: number
  durationMinute: number
  title: string
  subtitle?: string
  type: EmployeeTimelineBarType
}

export interface EmployeeTimelineBarProps {
  item: EmployeeTimelineBarData
  className?: string
}

export function EmployeeTimelineBar({ item, className = '' }: EmployeeTimelineBarProps) {
  const baseClass =
    item.type === 'booking'
      ? 'border-[#4db4ca] bg-[#6db6c8] text-[#e8eff1]'
      : item.type === 'blocked'
        ? 'border-[#d59fa5] bg-[#d4a1a6] text-[#f8f1f1]'
        : 'border-[#4db4ca] bg-[#b9bfc3] text-[#d5dde0]'

  return (
    <div className={`h-full w-full rounded-[24px] border px-4 py-2 text-[9px] font-semibold leading-[1.15] ${baseClass} ${className}`}>
      <div>{item.title}</div>
      {item.subtitle ? <div className="whitespace-pre-line">{item.subtitle}</div> : null}
    </div>
  )
}
