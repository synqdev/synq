'use client'

import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { adminLogout } from '@/app/actions/admin'
import { useCalendarPolling } from '@/hooks/useCalendarPolling'
import { formatInTimeZone } from '@/lib/utils/time'
import { blockWorkerTime, createAdminBooking, sendBooking } from '@/app/actions/admin-booking'
import { WorkerForm } from '../../workers/worker-form'
import { WorkerTable } from '../../workers/worker-table'
import { ServiceForm } from '../../services/service-form'
import { ServiceTable } from '../../services/service-table'
import { ResourceForm } from '../../resources/resource-form'
import { ResourceTable } from '../../resources/resource-table'
import {
  TimetableWithTabs,
  type SideActionItem,
  type TimelineBarItem,
  type TimelineStaff,
  type TopTabItem,
} from '@/components/calendar/prototype-calendar-view'

interface PrototypeBooking {
  id: string
  startsAt: string
  endsAt: string
  workerId: string
  serviceId: string
  customerName: string
  serviceName: string
}

interface PrototypeWorker {
  id: string
  name: string
}

interface WorkerCrudItem {
  id: string
  name: string
  nameEn: string | null
  isActive: boolean
  createdAt: Date
}

interface ServiceCrudItem {
  id: string
  name: string
  nameEn: string | null
  description: string | null
  duration: number
  price: number
  isActive: boolean
  createdAt: Date
}

interface ResourceCrudItem {
  id: string
  name: string
  isActive: boolean
  createdAt: Date
}

interface DragDraft {
  barId: string
  previousRowId: string
  previousStartMinute: number
  nextRowId: string
  nextStartMinute: number
}

interface AdminDashboardPrototypeClientProps {
  locale: string
  dateStr: string
  initialWorkers: PrototypeWorker[]
  initialCustomers: Array<{ id: string; name: string }>
  initialServices: Array<{ id: string; name: string; duration: number }>
  initialWorkerCrud: WorkerCrudItem[]
  initialServiceCrud: ServiceCrudItem[]
  initialResourceCrud: ResourceCrudItem[]
  initialBookings: PrototypeBooking[]
}

const tabs: TopTabItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'workers', label: 'Workers', icon: 'user' },
  { id: 'services', label: 'Services', icon: 'services' },
  { id: 'resources', label: 'Resources', icon: 'settings' },
  { id: 'logout', label: 'Logout', icon: 'logout' },
]

const tabRouteById: Record<string, string> = {
  dashboard: '/admin/dashboard',
  calendar: '/admin/dashboard/new',
}

const embeddedPanelTabs = new Set(['calendar', 'workers', 'services', 'resources'])

const sideActions: SideActionItem[] = [
  { id: 'refresh', icon: 'refresh' },
  { id: 'home', icon: 'home' },
  { id: 'calendar', icon: 'calendar' },
  { id: 'roster', icon: 'user' },
  { id: 'client', icon: 'client' },
  { id: 'services', icon: 'services' },
  { id: 'analytics', icon: 'analytics' },
  { id: 'settings', icon: 'settings' },
]

function timeToMinute(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minuteToTime(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function toBars(bookings: PrototypeBooking[]): TimelineBarItem[] {
  return bookings.map((booking) => {
    const start = formatInTimeZone(booking.startsAt).time
    const end = formatInTimeZone(booking.endsAt).time
    const startMinute = timeToMinute(start)
    const endMinute = timeToMinute(end)
    const durationMinute = Math.max(60, endMinute - startMinute)

    return {
      id: booking.id,
      rowId: booking.workerId,
      startMinute,
      durationMinute,
      title: `${start}-${end}`,
      subtitle: `${booking.customerName}\n${booking.serviceName}`,
      type: booking.serviceId === 'block-service' ? 'blocked' : 'booking',
    }
  })
}

function toStaff(workers: PrototypeWorker[]): TimelineStaff[] {
  return workers.map((worker) => ({
    id: worker.id,
    name: worker.name,
    avatarInitials: worker.name.slice(0, 1).toUpperCase(),
  }))
}

function areBarsEqual(a: TimelineBarItem[], b: TimelineBarItem[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i]
    const right = b[i]
    if (
      left.id !== right.id ||
      left.rowId !== right.rowId ||
      left.startMinute !== right.startMinute ||
      left.durationMinute !== right.durationMinute ||
      left.title !== right.title ||
      left.subtitle !== right.subtitle ||
      left.type !== right.type
    ) {
      return false
    }
  }
  return true
}

function getNowLocal() {
  const now = new Date()
  const time = minuteToTime(now.getHours() * 60 + now.getMinutes())
  return {
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    minute: timeToMinute(time),
    label: time,
  }
}

function CrudPanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/18 bg-[#c9d2d6]/92 p-4">
      <h3 className="mb-3 text-lg font-semibold text-[#32444b]">{title}</h3>
      {children}
    </section>
  )
}

export function AdminDashboardPrototypeClient({
  locale,
  dateStr,
  initialWorkers,
  initialCustomers,
  initialServices,
  initialWorkerCrud,
  initialServiceCrud,
  initialResourceCrud,
  initialBookings,
}: AdminDashboardPrototypeClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeDateStr = searchParams.get('date') ?? dateStr
  const tabParam = searchParams.get('tab')
  const [activeTabId, setActiveTabId] = useState(() =>
    tabParam && tabs.some((tab) => tab.id === tabParam) ? tabParam : 'calendar'
  )
  const [activeSideActionId, setActiveSideActionId] = useState('home')
  const [bars, setBars] = useState<TimelineBarItem[]>(() => toBars(initialBookings))
  const [baselineBars, setBaselineBars] = useState<TimelineBarItem[]>(() => toBars(initialBookings))
  const [dragDraft, setDragDraft] = useState<DragDraft | null>(null)
  const [createDraft, setCreateDraft] = useState<{ rowId: string; startMinute: number } | null>(null)
  const [createMode, setCreateMode] = useState<'booking' | 'block'>('booking')
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomers[0]?.id ?? '')
  const [selectedServiceId, setSelectedServiceId] = useState(initialServices[0]?.id ?? '')
  const [blockDurationMinute, setBlockDurationMinute] = useState('60')
  const [modalMessage, setModalMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const nowTick = useMemo(() => getNowLocal(), [])

  const { workers: polledWorkers, bookings: polledBookings, refresh } = useCalendarPolling({
    date: activeDateStr,
    mode: 'admin',
    pollingInterval: 10000,
  })

  useEffect(() => {
    const seededBars = toBars(initialBookings)
    setBars(seededBars)
    setBaselineBars(seededBars)
    setDragDraft(null)
    setModalMessage(null)
  }, [activeDateStr, initialBookings])

  const effectiveStaff = useMemo<TimelineStaff[]>(() => {
    if (polledWorkers.length > 0) {
      return toStaff(polledWorkers)
    }
    return toStaff(initialWorkers)
  }, [initialWorkers, polledWorkers])

  useEffect(() => {
    if (polledWorkers.length === 0) return

    const nextBars: TimelineBarItem[] = polledBookings.map((booking) => {
      const start = formatInTimeZone(booking.startsAt).time
      const end = formatInTimeZone(booking.endsAt).time
      const startMinute = timeToMinute(start)
      const endMinute = timeToMinute(end)
      const durationMinute = Math.max(60, endMinute - startMinute)

      return {
        id: booking.id,
        rowId: booking.workerId,
        startMinute,
        durationMinute,
        title: `${start}-${end}`,
        subtitle: `${booking.customerName ?? ''}\n${booking.serviceName ?? ''}`.trim(),
        type: booking.serviceId === 'block-service' ? 'blocked' : 'booking',
      }
    })

    setBars((prev) => (areBarsEqual(prev, nextBars) ? prev : nextBars))
    setBaselineBars((prev) => (areBarsEqual(prev, nextBars) ? prev : nextBars))
  }, [polledBookings, polledWorkers.length])

  const currentMinute = nowTick.minute
  const currentTimeLabel = nowTick.label

  const openMoveModal = (payload: {
    bar: TimelineBarItem
    previousRowId: string
    previousStartMinute: number
  }) => {
    if (payload.bar.type !== 'booking') {
      return
    }
    setDragDraft({
      barId: payload.bar.id,
      previousRowId: payload.previousRowId,
      previousStartMinute: payload.previousStartMinute,
      nextRowId: payload.bar.rowId,
      nextStartMinute: payload.bar.startMinute,
    })
    setModalMessage(null)
  }

  const restoreDraftPosition = () => {
    if (!dragDraft) return
    setBars((current) =>
      current.map((bar) =>
        bar.id === dragDraft.barId
          ? { ...bar, rowId: dragDraft.previousRowId, startMinute: dragDraft.previousStartMinute }
          : bar
      )
    )
  }

  const handleConfirmMove = () => {
    if (!dragDraft) return

    startTransition(async () => {
      try {
        await sendBooking({
          bookingId: dragDraft.barId,
          workerId: dragDraft.nextRowId,
          date: activeDateStr,
          startTime: minuteToTime(dragDraft.nextStartMinute),
        })
        setModalMessage('Booking updated')
        refresh()
        setTimeout(() => {
          setDragDraft(null)
          setModalMessage(null)
        }, 700)
      } catch (_error) {
        setModalMessage('Failed to update booking')
        restoreDraftPosition()
        setTimeout(() => {
          setDragDraft(null)
          setModalMessage(null)
        }, 1000)
      }
    })
  }

  const handleCancelMove = () => {
    restoreDraftPosition()
    setBars(baselineBars)
    setDragDraft(null)
    setModalMessage(null)
  }

  const handleCreateSlot = (payload: { rowId: string; startMinute: number }) => {
    setCreateDraft(payload)
    setCreateMode('booking')
    setModalMessage(null)
  }

  const closeCreateModal = () => {
    setCreateDraft(null)
    setModalMessage(null)
  }

  const handleConfirmCreate = () => {
    if (!createDraft) return

    startTransition(async () => {
      try {
        if (createMode === 'booking') {
          const service = initialServices.find((item) => item.id === selectedServiceId)
          const duration = service?.duration ?? 60
          await createAdminBooking({
            customerId: selectedCustomerId,
            workerId: createDraft.rowId,
            serviceId: selectedServiceId,
            date: activeDateStr,
            startTime: minuteToTime(createDraft.startMinute),
            endTime: minuteToTime(createDraft.startMinute + duration),
          })
          setModalMessage('Booking created')
        } else {
          const formData = new FormData()
          formData.set('workerId', createDraft.rowId)
          formData.set('date', activeDateStr)
          formData.set('startTime', minuteToTime(createDraft.startMinute))
          formData.set('endTime', minuteToTime(createDraft.startMinute + Number(blockDurationMinute)))
          await blockWorkerTime(formData)
          setModalMessage('Time blocked')
        }
        refresh()
        setTimeout(() => {
          closeCreateModal()
        }, 700)
      } catch {
        setModalMessage(createMode === 'booking' ? 'Failed to create booking' : 'Failed to block time')
      }
    })
  }

  useEffect(() => {
    if (tabParam && tabs.some((tab) => tab.id === tabParam)) {
      setActiveTabId(tabParam)
      return
    }
    const found = tabs.find((tab) => tab.id in tabRouteById && pathname?.startsWith(`/${locale}${tabRouteById[tab.id]}`))
    if (found) {
      setActiveTabId(found.id)
    }
  }, [locale, pathname, tabParam])

  const updateUrlTab = (id: string) => {
    const next = new URLSearchParams(searchParams.toString())
    next.set('date', activeDateStr)
    next.set('tab', id)
    router.replace(`/${locale}/admin/dashboard/new?${next.toString()}`)
  }

  const panelContent = activeTabId === 'workers' ? (
    <div className="h-full overflow-auto p-4">
      <div className="space-y-4">
        <CrudPanelSection title="Add Worker">
          <WorkerForm mode="create" />
        </CrudPanelSection>
        <CrudPanelSection title="Workers">
          <WorkerTable workers={initialWorkerCrud} />
        </CrudPanelSection>
      </div>
    </div>
  ) : activeTabId === 'services' ? (
    <div className="h-full overflow-auto p-4">
      <div className="space-y-4">
        <CrudPanelSection title="Add Service">
          <ServiceForm mode="create" />
        </CrudPanelSection>
        <CrudPanelSection title="Services">
          <ServiceTable services={initialServiceCrud} />
        </CrudPanelSection>
      </div>
    </div>
  ) : activeTabId === 'resources' ? (
    <div className="h-full overflow-auto p-4">
      <div className="space-y-4">
        <CrudPanelSection title="Add Resource">
          <ResourceForm mode="create" />
        </CrudPanelSection>
        <CrudPanelSection title="Resources">
          <ResourceTable resources={initialResourceCrud} />
        </CrudPanelSection>
      </div>
    </div>
  ) : undefined

  return (
    <div className="relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] h-[calc(100dvh-140px)] min-h-[640px] w-screen px-3 sm:px-4">
      <TimetableWithTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={(id) => {
          if (id === 'logout') {
            startTransition(async () => {
              await adminLogout()
            })
            return
          }
          if (embeddedPanelTabs.has(id)) {
            setActiveTabId(id)
            updateUrlTab(id)
            return
          }
          const route = tabRouteById[id]
          if (!route) return
          router.push(`/${locale}${route}`)
        }}
        sideActions={sideActions}
        activeSideActionId={activeSideActionId}
        onSideActionChange={setActiveSideActionId}
        staff={effectiveStaff}
        bars={bars}
        onBarsChange={setBars}
        onTimeSlotClick={handleCreateSlot}
        onBarDragEnd={openMoveModal}
        panelContent={panelContent}
        startHour={10}
        endHour={18}
        currentTimeLabel={currentTimeLabel}
        currentMinute={currentMinute}
        className="h-full"
      />

      {dragDraft ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30">
          <div className="w-[340px] rounded-xl bg-white p-4 shadow-2xl">
            <div className="text-sm font-semibold text-[#1e2931]">
              Confirm booking move?
            </div>
            <div className="mt-2 text-xs text-[#4f5d68]">
              {minuteToTime(dragDraft.nextStartMinute)} on selected staff row
            </div>

            {isPending ? (
              <div className="mt-3 text-xs text-[#4f5d68]">Saving...</div>
            ) : null}
            {modalMessage ? (
              <div className={`mt-3 text-xs ${modalMessage.includes('Failed') ? 'text-red-600' : 'text-green-700'}`}>
                {modalMessage}
              </div>
            ) : null}

            {!isPending && !modalMessage ? (
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelMove}
                  className="rounded border border-gray-300 px-3 py-1 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMove}
                  className="rounded bg-[#7d9ea7] px-3 py-1 text-sm text-white"
                >
                  Confirm
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {createDraft ? (
        <div className="fixed inset-0 z-[121] flex items-center justify-center bg-black/35">
          <div className="w-[360px] rounded-xl bg-white p-4 shadow-2xl">
            <div className="text-sm font-semibold text-[#1e2931]">Create from time slot</div>
            <div className="mt-2 text-xs text-[#4f5d68]">
              {minuteToTime(createDraft.startMinute)} on selected staff row
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setCreateMode('booking')}
                className={`rounded px-2 py-1 text-xs ${createMode === 'booking' ? 'bg-[#7d9ea7] text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Create Booking
              </button>
              <button
                type="button"
                onClick={() => setCreateMode('block')}
                className={`rounded px-2 py-1 text-xs ${createMode === 'block' ? 'bg-[#7d9ea7] text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Block Time
              </button>
            </div>

            {createMode === 'booking' ? (
              <div className="mt-3 space-y-2">
                <label className="block text-xs text-[#4f5d68]">
                  Customer
                  <select
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={selectedCustomerId}
                    onChange={(event) => setSelectedCustomerId(event.target.value)}
                  >
                    {initialCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs text-[#4f5d68]">
                  Service
                  <select
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={selectedServiceId}
                    onChange={(event) => setSelectedServiceId(event.target.value)}
                  >
                    {initialServices.map((service) => (
                      <option key={service.id} value={service.id}>{service.name} ({service.duration}m)</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <div className="mt-3">
                <label className="block text-xs text-[#4f5d68]">
                  Block Duration
                  <select
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    value={blockDurationMinute}
                    onChange={(event) => setBlockDurationMinute(event.target.value)}
                  >
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                    <option value="180">3 hours</option>
                  </select>
                </label>
              </div>
            )}

            {isPending ? <div className="mt-3 text-xs text-[#4f5d68]">Saving...</div> : null}
            {modalMessage ? (
              <div className={`mt-3 text-xs ${modalMessage.includes('Failed') ? 'text-red-600' : 'text-green-700'}`}>
                {modalMessage}
              </div>
            ) : null}

            {!isPending && !modalMessage ? (
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={closeCreateModal} className="rounded border border-gray-300 px-3 py-1 text-sm">
                  Cancel
                </button>
                <button type="button" onClick={handleConfirmCreate} className="rounded bg-[#7d9ea7] px-3 py-1 text-sm text-white">
                  Confirm
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
