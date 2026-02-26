'use client'

/**
 * Schedule Editor Component
 *
 * Client component for editing a worker's 7-day recurring weekly schedule.
 * Displays a grid with availability toggles and time selectors for each day.
 * Submits all 7 days in a single bulk save action.
 */

import { useState, useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { upsertWorkerSchedule } from '@/app/actions/worker-schedule'
import { generateTimeSlots } from '@/lib/utils/time'

interface DaySchedule {
  dayOfWeek: number
  startTime: string
  endTime: string
  isAvailable: boolean
}

interface ScheduleEditorProps {
  workerId: string
  initialSchedules: DaySchedule[]
}

export function ScheduleEditor({ workerId, initialSchedules }: ScheduleEditorProps) {
  const t = useTranslations('admin.schedulePage')

  // Generate time options from 06:00 to 23:00 in 30-minute increments
  // generateTimeSlots returns slots where the full duration fits, so we use
  // a large window: 06:00 to 23:30 with 30min step gives ['06:00'...'23:00']
  const timeOptions = generateTimeSlots('06:00', '23:30', 30)

  const [schedule, setSchedule] = useState<DaySchedule[]>(initialSchedules)

  const [state, formAction, isPending] = useActionState(
    async (
      _prevState: { success: boolean; error?: string } | null,
      formData: FormData
    ) => {
      return await upsertWorkerSchedule(workerId, formData)
    },
    null
  )

  const toggleAvailability = (dayIndex: number) => {
    setSchedule((prev) =>
      prev.map((day, i) =>
        i === dayIndex ? { ...day, isAvailable: !day.isAvailable } : day
      )
    )
  }

  const updateTime = (dayIndex: number, field: 'startTime' | 'endTime', value: string) => {
    setSchedule((prev) =>
      prev.map((day, i) => (i === dayIndex ? { ...day, [field]: value } : day))
    )
  }

  return (
    <Card title={t('title')}>
      <form action={formAction} className="space-y-1">
        {schedule.map((day, i) => (
          <div
            key={day.dayOfWeek}
            className="flex flex-wrap items-center gap-3 rounded-lg px-2 py-3 hover:bg-secondary-50 sm:flex-nowrap"
          >
            {/* Hidden inputs — always submitted regardless of availability */}
            <input
              type="hidden"
              name={`day_${i}_isAvailable`}
              value={day.isAvailable ? 'true' : 'false'}
            />

            {/* Day name label */}
            <span className="w-20 shrink-0 text-sm font-medium text-secondary-900">
              {t(`days.${day.dayOfWeek}` as `days.${0 | 1 | 2 | 3 | 4 | 5 | 6}`)}
            </span>

            {/* Availability toggle */}
            <button
              type="button"
              onClick={() => toggleAvailability(i)}
              className={`
                shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors
                ${
                  day.isAvailable
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-secondary-100 text-secondary-500 hover:bg-secondary-200'
                }
              `}
              aria-label={day.isAvailable ? t('available') : t('unavailable')}
            >
              {day.isAvailable ? t('available') : t('unavailable')}
            </button>

            {/* Time selectors — dimmed when unavailable */}
            <div
              className={`flex items-center gap-2 transition-opacity ${
                day.isAvailable ? 'opacity-100' : 'pointer-events-none opacity-40'
              }`}
            >
              <label className="sr-only" htmlFor={`day_${i}_startTime`}>
                {t('startTime')}
              </label>
              <select
                id={`day_${i}_startTime`}
                name={`day_${i}_startTime`}
                value={day.startTime}
                onChange={(e) => updateTime(i, 'startTime', e.target.value)}
                disabled={!day.isAvailable}
                className="rounded border border-secondary-300 px-2 py-1 text-sm text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>

              <span className="text-sm text-secondary-400">–</span>

              <label className="sr-only" htmlFor={`day_${i}_endTime`}>
                {t('endTime')}
              </label>
              <select
                id={`day_${i}_endTime`}
                name={`day_${i}_endTime`}
                value={day.endTime}
                onChange={(e) => updateTime(i, 'endTime', e.target.value)}
                disabled={!day.isAvailable}
                className="rounded border border-secondary-300 px-2 py-1 text-sm text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}

        {/* Save button and status feedback */}
        <div className="flex items-center gap-4 border-t border-secondary-100 pt-4">
          <Button type="submit" loading={isPending}>
            {isPending ? t('saving') : t('save')}
          </Button>

          {state?.success === true && (
            <span className="text-sm font-medium text-green-600">{t('saved')}</span>
          )}
          {state?.success === false && (
            <span className="text-sm font-medium text-red-600">
              {state.error ?? t('saveError')}
            </span>
          )}
        </div>
      </form>
    </Card>
  )
}
