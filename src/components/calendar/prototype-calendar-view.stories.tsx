import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import {
  SettingsRail,
  TimePassedOverlay,
  TimelineBar,
  TimetableWithTabs,
  type SideActionItem,
  type TimelineBarItem,
  type TimelineStaff,
  type TopTabItem,
} from './prototype-calendar-view'

const tabs: TopTabItem[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'roster', label: 'Roster', icon: 'user' },
  { id: 'client', label: 'Client', icon: 'client' },
  { id: 'services', label: 'Services', icon: 'services' },
  { id: 'analytics', label: 'Analytics', icon: 'analytics' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

const sideActions: SideActionItem[] = [
  { id: 'refresh', icon: 'refresh' },
  { id: 'home', icon: 'home' },
  { id: 'calendar', icon: 'calendar' },
  { id: 'user', icon: 'user' },
  { id: 'client', icon: 'client' },
  { id: 'services', icon: 'services' },
  { id: 'analytics', icon: 'analytics' },
  { id: 'settings', icon: 'settings' },
]

const portraitSvg = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
    <defs>
      <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#f5f6f8'/>
        <stop offset='100%' stop-color='#dde2e8'/>
      </linearGradient>
    </defs>
    <rect width='120' height='120' fill='url(#bg)'/>
    <circle cx='60' cy='47' r='20' fill='#efc8b3'/>
    <path d='M35 42c0-18 13-26 25-26s25 8 25 26v7H35z' fill='#4f5963'/>
    <rect x='34' y='76' width='52' height='32' rx='16' fill='#d6dce3'/>
  </svg>`
)
const avatarDataUri = `data:image/svg+xml;utf8,${portraitSvg}`

const staff: TimelineStaff[] = [
  { id: 'amy', name: 'Amy', avatarInitials: 'A', avatarSrc: avatarDataUri },
  { id: 'liz', name: 'Liz', avatarInitials: 'L', avatarSrc: avatarDataUri },
  { id: 'staff3', name: 'Staff 3', avatarInitials: 'S3', avatarSrc: avatarDataUri },
]

const initialBars: TimelineBarItem[] = [
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
    id: 'open-2',
    rowId: 'amy',
    startMinute: 13 * 60,
    durationMinute: 60,
    title: '',
    type: 'open',
  },
  {
    id: 'open-3',
    rowId: 'amy',
    startMinute: 14 * 60,
    durationMinute: 60,
    title: '',
    type: 'open',
  },
  {
    id: 'blocked-1',
    rowId: 'amy',
    startMinute: 15 * 60,
    durationMinute: 180,
    title: '',
    type: 'blocked',
  },
]

const StatefulTimetable = () => {
  const [activeTabId, setActiveTabId] = useState('home')
  const [activeSideActionId, setActiveSideActionId] = useState('home')
  const [bars, setBars] = useState<TimelineBarItem[]>(initialBars)

  return (
    <TimetableWithTabs
      tabs={tabs}
      activeTabId={activeTabId}
      onTabChange={setActiveTabId}
      sideActions={sideActions}
      activeSideActionId={activeSideActionId}
      onSideActionChange={setActiveSideActionId}
      staff={staff}
      bars={bars}
      onBarsChange={setBars}
      currentTimeLabel="12:24"
      startHour={10}
      endHour={18}
      className="h-full"
    />
  )
}

interface FlatSegment {
  id: string
  widthClass: string
  colorClass: string
}

interface FlatRow {
  staff: string
  segments: FlatSegment[]
}

const flatRows: FlatRow[] = [
  {
    staff: 'Staff 1',
    segments: [
      { id: 's1-a', widthClass: 'w-[25%]', colorClass: 'bg-[#6f6f6f]' },
      { id: 's1-b', widthClass: 'w-[16%]', colorClass: 'bg-[#94b1bf]' },
      { id: 's1-c', widthClass: 'w-[8%]', colorClass: 'bg-[#d8d8d8]' },
      { id: 's1-d', widthClass: 'w-[9%]', colorClass: 'bg-[#94b1bf]' },
      { id: 's1-e', widthClass: 'w-[8%]', colorClass: 'bg-[#d8d8d8]' },
      { id: 's1-f', widthClass: 'w-[9%]', colorClass: 'bg-[#94b1bf]' },
      { id: 's1-g', widthClass: 'w-[8%]', colorClass: 'bg-[#d8d8d8]' },
      { id: 's1-h', widthClass: 'w-[9%]', colorClass: 'bg-[#94b1bf]' },
      { id: 's1-i', widthClass: 'w-[8%]', colorClass: 'bg-white' },
    ],
  },
  {
    staff: 'Jon C',
    segments: [
      { id: 's2-a', widthClass: 'w-[25%]', colorClass: 'bg-[#6f6f6f]' },
      { id: 's2-b', widthClass: 'w-[16%]', colorClass: 'bg-[#94b1bf]' },
      { id: 's2-c', widthClass: 'w-[17%]', colorClass: 'bg-[#d8d8d8]' },
      { id: 's2-d', widthClass: 'w-[8%]', colorClass: 'bg-[#94b1bf]' },
      { id: 's2-e', widthClass: 'w-[8%]', colorClass: 'bg-[#d8d8d8]' },
      { id: 's2-f', widthClass: 'w-[8%]', colorClass: 'bg-[#94b1bf]' },
      { id: 's2-g', widthClass: 'w-[10%]', colorClass: 'bg-[#94b1bf]' },
      { id: 's2-h', widthClass: 'w-[8%]', colorClass: 'bg-white' },
    ],
  },
  {
    staff: 'Staff 3',
    segments: [
      { id: 's3-a', widthClass: 'w-[10%]', colorClass: 'bg-[#45545d]' },
      { id: 's3-b', widthClass: 'w-[10%]', colorClass: 'bg-[#6f6f6f]' },
      { id: 's3-c', widthClass: 'w-[10%]', colorClass: 'bg-[#6f6f6f]' },
      { id: 's3-d', widthClass: 'w-[10%]', colorClass: 'bg-white' },
      { id: 's3-e', widthClass: 'w-[10%]', colorClass: 'bg-[#94b1bf]' },
      { id: 's3-f', widthClass: 'w-[10%]', colorClass: 'bg-[#94b1bf]' },
      { id: 's3-g', widthClass: 'w-[10%]', colorClass: 'bg-[#d8d8d8]' },
      { id: 's3-h', widthClass: 'w-[10%]', colorClass: 'bg-[#d8d8d8]' },
      { id: 's3-i', widthClass: 'w-[10%]', colorClass: 'bg-[#94b1bf]' },
      { id: 's3-j', widthClass: 'w-[10%]', colorClass: 'bg-[#94b1bf]' },
    ],
  },
]

const UserFlatCalendar = () => {
  return (
    <div className="min-h-screen bg-[#ececec] p-8 text-[#2b2b2b] font-['Arial_Narrow','Franklin_Gothic_Medium','sans-serif']">
      <div className="mx-auto w-full max-w-[1400px]">
        <h1 className="text-[56px] font-black uppercase tracking-tight">SYNQ//USER</h1>

        <div className="mt-8 flex items-end gap-3">
          <div>
            <div className="mb-1 text-[24px] font-black uppercase">Date</div>
            <button className="h-[72px] rounded-[14px] border-[3px] border-[#1d1d1d] bg-white px-7 text-[52px] font-black leading-none">
              1/20/26
            </button>
          </div>
          <div>
            <div className="mb-1 text-[24px] font-black uppercase">Options</div>
            <button className="h-[72px] rounded-[14px] border-[3px] border-[#1d1d1d] bg-white px-8 text-[52px] font-black leading-none">
              Standard
            </button>
          </div>
          <button className="h-[72px] rounded-[14px] border-[3px] border-[#1d1d1d] bg-white px-8 text-[52px] font-black leading-none">
            Calendar
          </button>
        </div>

        <div className="mt-10 space-y-10">
          {flatRows.map((row) => (
            <div key={row.staff}>
              <div className="mb-2 text-[48px] font-black uppercase leading-none">{row.staff}</div>
              <div className="overflow-hidden rounded-[16px] border-[4px] border-[#1d1d1d] bg-white">
                <div className="flex h-[84px]">
                  {row.segments.map((segment) => (
                    <div key={segment.id} className={`${segment.widthClass} ${segment.colorClass} border-r-[3px] border-[#1d1d1d] last:border-r-0`} />
                  ))}
                </div>
              </div>
              <div className="mt-1 flex justify-between text-[36px] font-black leading-none text-[#3a3a3a]">
                {Array.from({ length: 12 }).map((_, index) => (
                  <span key={`${row.staff}-${index}`}>10:00</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button className="h-[86px] rounded-[14px] border-[4px] border-[#1d1d1d] bg-white px-12 text-[56px] font-black uppercase leading-none">
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

const meta: Meta<typeof TimetableWithTabs> = {
  title: 'Calendar/NewViewPrototype',
  component: TimetableWithTabs,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof TimetableWithTabs>

export const AdminGlassView: Story = {
  render: () => (
    <div className="flex min-h-screen items-center justify-center bg-[#c8c5bc] p-3">
      <div className="mx-auto h-[min(92vh,980px)] w-full max-w-[1600px]">
        <StatefulTimetable />
      </div>
    </div>
  ),
}

export const UserFlatView: Story = {
  render: () => <UserFlatCalendar />,
}

export const SettingsBarOnly: Story = {
  render: () => (
    <div className="min-h-[70vh] bg-[#c8c5bc] p-8">
      <SettingsRail items={sideActions} activeItemId="home" />
    </div>
  ),
}

export const TimelineBarOnly: Story = {
  render: () => (
    <div className="min-h-[50vh] bg-[#7d9ea7] p-8">
      <div className="max-w-[720px]">
        <TimelineBar
          item={{
            id: 'bar-demo',
            rowId: 'amy',
            startMinute: 10 * 60,
            durationMinute: 60,
            title: '10:00-11:00',
            subtitle: 'Jon Chan\n1 Hour Massage',
            type: 'booking',
          }}
        />
      </div>
    </div>
  ),
}

export const TimePassedOverlayOnly: Story = {
  render: () => (
    <div className="min-h-[50vh] bg-[#c8c5bc] p-8">
      <div className="relative h-[220px] overflow-hidden rounded-2xl bg-[#7d9ea7] p-2">
        <div className="absolute inset-2 rounded-xl border border-white/30" />
        <TimePassedOverlay startMinute={10 * 60} endMinute={24 * 60} currentMinute={12 * 60 + 24} />
      </div>
    </div>
  ),
}
