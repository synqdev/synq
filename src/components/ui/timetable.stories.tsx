import type { Meta, StoryObj } from '@storybook/react'
import { useMemo, useState } from 'react'
import { Timetable, type TimetableEmployee, type TimetableTab } from './timetable'

const icon = (path: string) => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d={path} />
  </svg>
)

const tabs: TimetableTab[] = [
  { id: 'day', label: 'Day', icon: icon('M7 2.5a1 1 0 0 1 1 1V5h8V3.5a1 1 0 1 1 2 0V5h1.2A2.8 2.8 0 0 1 22 7.8v11.4A2.8 2.8 0 0 1 19.2 22H4.8A2.8 2.8 0 0 1 2 19.2V7.8A2.8 2.8 0 0 1 4.8 5H6V3.5a1 1 0 0 1 1-1Z') },
  { id: 'week', label: 'Week', icon: icon('M3 20.5h18v1.5H3zM5 11h3v8H5zm5-5h3v13h-3zm5 3h3v10h-3z') },
]

const portraitSvg = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
    <rect width='120' height='120' fill='#e7eaef'/>
    <circle cx='60' cy='47' r='20' fill='#efc8b3'/>
    <path d='M35 42c0-18 13-26 25-26s25 8 25 26v7H35z' fill='#4f5963'/>
    <rect x='34' y='76' width='52' height='32' rx='16' fill='#d6dce3'/>
  </svg>`
)
const avatarDataUri = `data:image/svg+xml;utf8,${portraitSvg}`

const baseEmployees: Omit<TimetableEmployee, 'segments'>[] = [
  { id: 'amy', name: 'Amy', avatarInitials: 'A', avatarSrc: avatarDataUri },
  { id: 'liz', name: 'Liz', avatarInitials: 'L', avatarSrc: avatarDataUri },
  { id: 'staff3', name: 'Staff 3', avatarInitials: 'S3', avatarSrc: avatarDataUri },
]

const dayEmployees: TimetableEmployee[] = [
  {
    ...baseEmployees[0],
    segments: [
      {
        id: 'book-1',
        rowId: 'amy',
        startMinute: 10 * 60,
        durationMinute: 60,
        title: '10:00-11:00',
        subtitle: 'Jon Chan\n1 Hour Massage',
        type: 'booking',
      },
      {
        id: 'open-1',
        rowId: 'amy',
        startMinute: 11 * 60,
        durationMinute: 60,
        title: '',
        type: 'open',
      },
      {
        id: 'book-2',
        rowId: 'amy',
        startMinute: 12 * 60,
        durationMinute: 60,
        title: '12:00-13:00',
        subtitle: 'Anthony Lee\n1 Hour Massage',
        type: 'booking',
      },
      {
        id: 'blocked-1',
        rowId: 'amy',
        startMinute: 13 * 60,
        durationMinute: 60,
        title: '',
        type: 'blocked',
      },
    ],
  },
  { ...baseEmployees[1], segments: [] },
  { ...baseEmployees[2], segments: [] },
]

const weekEmployees: TimetableEmployee[] = [
  {
    ...baseEmployees[0],
    segments: [
      {
        id: 'week-1',
        rowId: 'amy',
        startMinute: 11 * 60,
        durationMinute: 120,
        title: '11:00-13:00',
        subtitle: 'Week View\nConsultation',
        type: 'booking',
      },
    ],
  },
  {
    ...baseEmployees[1],
    segments: [
      {
        id: 'week-2',
        rowId: 'liz',
        startMinute: 14 * 60,
        durationMinute: 120,
        title: '14:00-16:00',
        subtitle: 'Week View\nFollow-up',
        type: 'booking',
      },
    ],
  },
  { ...baseEmployees[2], segments: [] },
]

const StatefulTimetable = () => {
  const [activeTab, setActiveTab] = useState('day')
  const [employeesByTab, setEmployeesByTab] = useState<Record<string, TimetableEmployee[]>>({
    day: dayEmployees,
    week: weekEmployees,
  })

  const currentEmployees = useMemo(
    () => employeesByTab[activeTab] ?? [],
    [activeTab, employeesByTab]
  )

  return (
    <Timetable
      tabs={tabs}
      activeTabId={activeTab}
      onTabChange={setActiveTab}
      employees={currentEmployees}
      onEmployeesChange={(nextEmployees) =>
        setEmployeesByTab((prev) => ({ ...prev, [activeTab]: nextEmployees }))
      }
      startHour={10}
      endHour={18}
      currentTimeLabel="12:24"
      currentMinute={12 * 60 + 24}
      snapMinutes={60}
      allowOverlap={false}
      className="h-full"
    />
  )
}

const meta: Meta<typeof Timetable> = {
  title: 'UI/Timetable',
  component: Timetable,
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof Timetable>

export const DraggableTimelineBars: Story = {
  render: () => (
    <div className="flex min-h-screen items-center justify-center bg-[#c8c5bc] p-3">
      <div className="mx-auto h-[min(92vh,980px)] w-full max-w-[1480px]">
        <StatefulTimetable />
      </div>
    </div>
  ),
}
