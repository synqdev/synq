'use client'

/**
 * Staff Schedule Grid Component
 *
 * WhenIWork-style staff scheduling grid with monthly and weekly views.
 * Monthly view: compact calendar with workers as rows, days as columns.
 * Weekly view: detailed view with shift times and booking counts.
 * Supports inline editing of shifts via a popover editor.
 */

import { useCallback, useMemo, useState, useTransition } from 'react'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { Spinner } from '@/components/ui/spinner'
import { generateTimeSlots } from '@/lib/utils/time'
import { upsertWorkerSchedule } from '@/app/actions/worker-schedule'

interface DaySchedule {
  dayOfWeek: number
  startTime: string
  endTime: string
  isAvailable: boolean
}

interface WeekBooking {
  date: string
  count: number
  hours: number
}

interface WorkerScheduleData {
  id: string
  name: string
  schedules: DaySchedule[]
  weekBookings: WeekBooking[]
  totalHoursScheduled: number
  totalBookings: number
}

interface WeeklyResponse {
  workers: WorkerScheduleData[]
  weekStart: string
  weekEnd: string
}

interface WeeklyScheduleGridProps {
  locale: string
}

type ViewMode = 'monthly' | 'weekly'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const SHORT_DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SHORT_DAY_NAMES_JA = ['日', '月', '火', '水', '木', '金', '土']
const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_NAMES_JA = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function getMonthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function getDaysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

function formatDateShort(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatWeekRange(start: Date, locale: string): string {
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  if (locale === 'ja') {
    return `${start.getFullYear()}/${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[start.getMonth()]} ${start.getDate()} - ${months[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`
}

function formatMonthYear(d: Date, locale: string): string {
  if (locale === 'ja') {
    return `${d.getFullYear()}年${MONTH_NAMES_JA[d.getMonth()]}`
  }
  return `${MONTH_NAMES_EN[d.getMonth()]} ${d.getFullYear()}`
}

function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface EditingCell {
  workerId: string
  workerName: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isAvailable: boolean
}

export function WeeklyScheduleGrid({ locale }: WeeklyScheduleGridProps) {
  const t = useTranslations('admin.schedule')
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [monthDate, setMonthDate] = useState(() => getMonthStart(new Date()))
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isPending, startTransition] = useTransition()

  const timeOptions = useMemo(() => generateTimeSlots('06:00', '23:30', 30), [])
  const dayNames = locale === 'ja' ? SHORT_DAY_NAMES_JA : SHORT_DAY_NAMES_EN
  const todayStr = useMemo(() => dateToStr(new Date()), [])

  // Compute fetch params based on view mode
  const fetchParams = useMemo(() => {
    if (viewMode === 'weekly') {
      return { startDate: dateToStr(weekStart), days: 7 }
    }
    const daysInMonth = getDaysInMonth(monthDate)
    return { startDate: dateToStr(monthDate), days: daysInMonth }
  }, [viewMode, weekStart, monthDate])

  const { data, isLoading, mutate } = useSWR<WeeklyResponse>(
    `/api/admin/schedule/weekly?startDate=${fetchParams.startDate}&days=${fetchParams.days}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  // Build date arrays for each view
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [weekStart])

  const monthDates = useMemo(() => {
    const daysInMonth = getDaysInMonth(monthDate)
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(monthDate)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [monthDate])

  // Navigation handlers
  const goToPrevWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
    setEditingCell(null)
  }, [])

  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
    setEditingCell(null)
  }, [])

  const goToPrevMonth = useCallback(() => {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    setEditingCell(null)
  }, [])

  const goToNextMonth = useCallback(() => {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    setEditingCell(null)
  }, [])

  const goToToday = useCallback(() => {
    if (viewMode === 'weekly') {
      setWeekStart(getMonday(new Date()))
    } else {
      setMonthDate(getMonthStart(new Date()))
    }
    setEditingCell(null)
  }, [viewMode])

  const openEditor = (worker: WorkerScheduleData, dayOfWeek: number) => {
    const schedule = worker.schedules.find((s) => s.dayOfWeek === dayOfWeek)
    setEditingCell({
      workerId: worker.id,
      workerName: worker.name,
      dayOfWeek,
      startTime: schedule?.startTime ?? '09:00',
      endTime: schedule?.endTime ?? '18:00',
      isAvailable: schedule?.isAvailable ?? false,
    })
    setSaveStatus('idle')
  }

  const handleSave = () => {
    if (!editingCell || !data) return

    const worker = data.workers.find((w) => w.id === editingCell.workerId)
    if (!worker) return

    setSaveStatus('saving')
    startTransition(async () => {
      const formData = new FormData()
      for (let i = 0; i < 7; i++) {
        const existing = worker.schedules.find((s) => s.dayOfWeek === i)
        if (i === editingCell.dayOfWeek) {
          formData.set(`day_${i}_isAvailable`, editingCell.isAvailable ? 'true' : 'false')
          formData.set(`day_${i}_startTime`, editingCell.startTime)
          formData.set(`day_${i}_endTime`, editingCell.endTime)
        } else {
          formData.set(`day_${i}_isAvailable`, existing?.isAvailable ? 'true' : 'false')
          formData.set(`day_${i}_startTime`, existing?.startTime ?? '09:00')
          formData.set(`day_${i}_endTime`, existing?.endTime ?? '18:00')
        }
      }

      const result = await upsertWorkerSchedule(editingCell.workerId, formData)
      if (result.success) {
        setSaveStatus('saved')
        mutate()
        setTimeout(() => {
          setEditingCell(null)
          setSaveStatus('idle')
        }, 800)
      } else {
        setSaveStatus('error')
      }
    })
  }

  const getBookingCount = (worker: WorkerScheduleData, dateStr: string): number => {
    const found = worker.weekBookings.find((b) => b.date === dateStr)
    return found?.count ?? 0
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const workers = data?.workers ?? []

  const goPrev = viewMode === 'weekly' ? goToPrevWeek : goToPrevMonth
  const goNext = viewMode === 'weekly' ? goToNextWeek : goToNextMonth
  const headerLabel =
    viewMode === 'weekly'
      ? formatWeekRange(weekStart, locale)
      : formatMonthYear(monthDate, locale)

  const dates = viewMode === 'weekly' ? weekDates : monthDates

  return (
    <div className="flex h-full flex-col">
      {/* Header with view toggle and navigation */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-secondary-900">{t('title')}</h2>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-secondary-300 overflow-hidden">
            <button
              type="button"
              onClick={() => { setViewMode('monthly'); setEditingCell(null) }}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'monthly'
                  ? 'bg-primary-600 text-white'
                  : 'text-secondary-600 hover:bg-secondary-50'
              }`}
            >
              {t('monthly')}
            </button>
            <button
              type="button"
              onClick={() => { setViewMode('weekly'); setEditingCell(null) }}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'weekly'
                  ? 'bg-primary-600 text-white'
                  : 'text-secondary-600 hover:bg-secondary-50'
              }`}
            >
              {t('weekly')}
            </button>
          </div>

          {/* Navigation */}
          <button
            type="button"
            onClick={goPrev}
            className="rounded-lg border border-secondary-300 px-3 py-1.5 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors"
            aria-label={t('prev')}
          >
            &larr;
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-secondary-300 px-3 py-1.5 text-sm font-medium text-secondary-700 hover:bg-secondary-50 transition-colors"
          >
            {t('today')}
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-lg border border-secondary-300 px-3 py-1.5 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors"
            aria-label={t('next')}
          >
            &rarr;
          </button>
        </div>
      </div>

      <div className="mb-2 text-center text-sm font-medium text-secondary-600">
        {headerLabel}
      </div>

      {/* Schedule grid */}
      <div className="flex-1 overflow-auto rounded-xl border border-secondary-200 bg-white">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="bg-secondary-50">
              <th className="sticky left-0 z-10 w-36 border-b border-r border-secondary-200 bg-secondary-50 px-3 py-2 text-left text-xs font-semibold text-secondary-600">
                {locale === 'ja' ? 'スタッフ' : 'Staff'}
              </th>
              {dates.map((date, i) => {
                const dateStr = dateToStr(date)
                const isToday = dateStr === todayStr
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                return (
                  <th
                    key={i}
                    className={`border-b border-r border-secondary-200 text-center text-xs font-semibold last:border-r-0 ${
                      viewMode === 'monthly' ? 'px-0.5 py-1.5' : 'px-2 py-2'
                    } ${
                      isToday
                        ? 'bg-primary-50 text-primary-700'
                        : isWeekend
                          ? 'bg-secondary-100/50 text-secondary-500'
                          : 'text-secondary-600'
                    }`}
                  >
                    <div>{viewMode === 'monthly' ? dayNames[date.getDay()] : dayNames[date.getDay()]}</div>
                    <div className={`font-normal ${viewMode === 'monthly' ? 'text-[10px]' : 'text-[11px]'}`}>
                      {viewMode === 'monthly' ? date.getDate() : formatDateShort(date)}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {workers.length === 0 ? (
              <tr>
                <td colSpan={dates.length + 1} className="py-12 text-center text-sm text-secondary-400">
                  {locale === 'ja' ? 'スタッフがいません' : 'No workers found'}
                </td>
              </tr>
            ) : (
              workers.map((worker) => (
                <tr key={worker.id} className="group">
                  <td className="sticky left-0 z-10 border-b border-r border-secondary-200 bg-white px-3 py-2 group-hover:bg-secondary-50/50">
                    <div className="text-sm font-medium text-secondary-900">{worker.name}</div>
                    <div className="text-[11px] text-secondary-400">
                      {t('totalHours', { hours: worker.totalHoursScheduled })}
                    </div>
                  </td>

                  {dates.map((date, colIdx) => {
                    const dow = date.getDay()
                    const schedule = worker.schedules.find((s) => s.dayOfWeek === dow)
                    const isAvailable = schedule?.isAvailable ?? false
                    const dateStr = dateToStr(date)
                    const isToday = dateStr === todayStr
                    const bookingCount = getBookingCount(worker, dateStr)
                    const isEditing =
                      editingCell?.workerId === worker.id && editingCell?.dayOfWeek === dow

                    if (viewMode === 'monthly') {
                      // Compact monthly cell
                      return (
                        <td
                          key={colIdx}
                          className={`relative border-b border-r border-secondary-200 last:border-r-0 cursor-pointer transition-colors ${
                            viewMode === 'monthly' ? 'px-0 py-1' : 'px-1 py-1.5'
                          } ${isToday ? 'ring-1 ring-inset ring-primary-400' : ''} ${
                            isAvailable
                              ? 'bg-green-50 hover:bg-green-100/70'
                              : 'bg-secondary-50 hover:bg-secondary-100/70'
                          }`}
                          onClick={() => openEditor(worker, dow)}
                          title={
                            isAvailable
                              ? `${schedule?.startTime}-${schedule?.endTime}${bookingCount > 0 ? ` (${bookingCount})` : ''}`
                              : t('off')
                          }
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            {isAvailable ? (
                              <>
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                {bookingCount > 0 && (
                                  <span className="text-[9px] font-medium text-primary-600">
                                    {bookingCount}
                                  </span>
                                )}
                              </>
                            ) : (
                              <div className="h-1.5 w-1.5 rounded-full bg-secondary-300" />
                            )}
                          </div>

                          {/* Inline editor popover (same for both views) */}
                          {isEditing && editingCell && (
                            <ShiftEditor
                              editingCell={editingCell}
                              setEditingCell={setEditingCell}
                              saveStatus={saveStatus}
                              setSaveStatus={setSaveStatus}
                              isPending={isPending}
                              handleSave={handleSave}
                              timeOptions={timeOptions}
                              locale={locale}
                              t={t}
                            />
                          )}
                        </td>
                      )
                    }

                    // Weekly view cell
                    return (
                      <td
                        key={colIdx}
                        className={`relative border-b border-r border-secondary-200 px-1 py-1.5 text-center last:border-r-0 ${
                          isToday ? 'bg-primary-50/30' : ''
                        } ${
                          isAvailable
                            ? 'bg-green-50 hover:bg-green-100/70'
                            : 'bg-secondary-50 hover:bg-secondary-100/70'
                        } cursor-pointer transition-colors`}
                        onClick={() => openEditor(worker, dow)}
                      >
                        {isAvailable ? (
                          <div>
                            <div className="text-xs font-medium text-green-700">
                              {schedule?.startTime}-{schedule?.endTime}
                            </div>
                            {bookingCount > 0 && (
                              <span className="mt-0.5 inline-block rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-700">
                                {bookingCount}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-secondary-400">{t('off')}</div>
                        )}

                        {isEditing && editingCell && (
                          <ShiftEditor
                            editingCell={editingCell}
                            setEditingCell={setEditingCell}
                            saveStatus={saveStatus}
                            setSaveStatus={setSaveStatus}
                            isPending={isPending}
                            handleSave={handleSave}
                            timeOptions={timeOptions}
                            locale={locale}
                            t={t}
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Extracted shift editor popover used by both monthly and weekly views. */
function ShiftEditor({
  editingCell,
  setEditingCell,
  saveStatus,
  setSaveStatus,
  isPending,
  handleSave,
  timeOptions,
  locale,
  t,
}: {
  editingCell: EditingCell
  setEditingCell: React.Dispatch<React.SetStateAction<EditingCell | null>>
  saveStatus: string
  setSaveStatus: React.Dispatch<React.SetStateAction<'idle' | 'saving' | 'saved' | 'error'>>
  isPending: boolean
  handleSave: () => void
  timeOptions: string[]
  locale: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any
}) {
  return (
    <div
      className="absolute left-1/2 top-full z-20 mt-1 w-56 -translate-x-1/2 rounded-lg border border-secondary-200 bg-white p-3 shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 text-xs font-semibold text-secondary-700">
        {t('editShift')}
      </div>

      <button
        type="button"
        onClick={() =>
          setEditingCell((prev) =>
            prev ? { ...prev, isAvailable: !prev.isAvailable } : null
          )
        }
        className={`mb-2 w-full rounded-md px-2 py-1 text-xs font-medium transition-colors ${
          editingCell.isAvailable
            ? 'bg-green-100 text-green-800 hover:bg-green-200'
            : 'bg-secondary-100 text-secondary-500 hover:bg-secondary-200'
        }`}
      >
        {editingCell.isAvailable ? t('available') : t('unavailable')}
      </button>

      {editingCell.isAvailable && (
        <div className="mb-2 flex items-center gap-1">
          <select
            value={editingCell.startTime}
            onChange={(e) =>
              setEditingCell((prev) =>
                prev ? { ...prev, startTime: e.target.value } : null
              )
            }
            className="w-full rounded border border-secondary-300 px-1 py-1 text-xs"
          >
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          <span className="text-xs text-secondary-400">-</span>
          <select
            value={editingCell.endTime}
            onChange={(e) =>
              setEditingCell((prev) =>
                prev ? { ...prev, endTime: e.target.value } : null
              )
            }
            className="w-full rounded border border-secondary-300 px-1 py-1 text-xs"
          >
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setEditingCell(null)
            setSaveStatus('idle')
          }}
          className="rounded border border-secondary-300 px-2 py-1 text-xs text-secondary-600 hover:bg-secondary-50"
        >
          {locale === 'ja' ? 'キャンセル' : 'Cancel'}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleSave()
          }}
          disabled={isPending || saveStatus === 'saving'}
          className="flex-1 rounded bg-primary-600 px-2 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saveStatus === 'saving'
            ? '...'
            : saveStatus === 'saved'
              ? t('saved')
              : saveStatus === 'error'
                ? t('saveError')
                : t('save')}
        </button>
      </div>
    </div>
  )
}
