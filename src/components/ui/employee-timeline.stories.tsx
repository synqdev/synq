import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { EmployeeTimeline } from './employee-timeline'
import type { EmployeeTimelineBarData } from './employee-timeline-bar'

const portraitSvg = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
    <rect width='120' height='120' fill='#e7eaef'/>
    <circle cx='60' cy='47' r='20' fill='#efc8b3'/>
    <path d='M35 42c0-18 13-26 25-26s25 8 25 26v7H35z' fill='#4f5963'/>
    <rect x='34' y='76' width='52' height='32' rx='16' fill='#d6dce3'/>
  </svg>`
)
const avatarDataUri = `data:image/svg+xml;utf8,${portraitSvg}`

const initialSegments: EmployeeTimelineBarData[] = [
  {
    id: 'blocked-1',
    rowId: 'amy',
    startMinute: 11 * 60,
    durationMinute: 60,
    title: '',
    type: 'blocked',
  },
  {
    id: 'booking-1',
    rowId: 'amy',
    startMinute: 12 * 60,
    durationMinute: 60,
    title: '12:00-13:00',
    subtitle: 'Anthony Lee\n1 Hour Massage',
    type: 'booking',
  },
  {
    id: 'blocked-2',
    rowId: 'amy',
    startMinute: 13 * 60,
    durationMinute: 60,
    title: '',
    type: 'blocked',
  },
]

const meta: Meta<typeof EmployeeTimeline> = {
  title: 'UI/EmployeeTimeline',
  component: EmployeeTimeline,
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof EmployeeTimeline>

export const DraggableRow: Story = {
  render: () => {
    const [segments, setSegments] = useState<EmployeeTimelineBarData[]>(initialSegments)

    return (
      <div className="min-h-screen bg-[#7f9ea8] p-6">
        <div className="mx-auto max-w-[1500px]">
          <div className="relative overflow-hidden rounded-[16px] border border-white/25">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div
                key={`line-${idx}`}
                className="pointer-events-none absolute top-0 bottom-0 w-px bg-white/35"
                style={{ left: `${(idx / 8) * 100}%` }}
              />
            ))}
            <EmployeeTimeline
              employee={{ id: 'amy', name: 'Amy', avatarInitials: 'A', avatarSrc: avatarDataUri }}
              segments={segments}
              onSegmentsChange={setSegments}
              startHour={10}
              endHour={18}
              snapMinutes={60}
            />
          </div>
        </div>
      </div>
    )
  },
}
