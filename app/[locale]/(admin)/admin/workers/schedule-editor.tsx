'use client'

import { useState, useActionState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
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
  workerName: string
  initialSchedules: DaySchedule[]
  onClose: () => void
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ScheduleEditor({ workerId, workerName, initialSchedules, onClose }: ScheduleEditorProps) {
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

  useEffect(() => {
    setSchedule(initialSchedules)
  }, [initialSchedules])

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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">
          Schedule: {workerName}
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Close
        </button>
      </div>

      <form action={formAction} className="space-y-1">
        {schedule.map((day, i) => (
          <div
            key={day.dayOfWeek}
            className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50"
          >
            <input
              type="hidden"
              name={`day_${i}_isAvailable`}
              value={day.isAvailable ? 'true' : 'false'}
            />

            <span className="w-12 shrink-0 text-sm font-medium text-gray-700">
              {DAY_LABELS[day.dayOfWeek]}
            </span>

            <button
              type="button"
              onClick={() => toggleAvailability(i)}
              className={`
                shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors
                ${day.isAvailable
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }
              `}
            >
              {day.isAvailable ? 'On' : 'Off'}
            </button>

            <div
              className={`flex items-center gap-2 transition-opacity ${
                day.isAvailable ? 'opacity-100' : 'pointer-events-none opacity-30'
              }`}
            >
              <select
                name={`day_${i}_startTime`}
                value={day.startTime}
                onChange={(e) => updateTime(i, 'startTime', e.target.value)}
                disabled={!day.isAvailable}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
              >
                {timeOptions.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>

              <span className="text-sm text-gray-400">–</span>

              <select
                name={`day_${i}_endTime`}
                value={day.endTime}
                onChange={(e) => updateTime(i, 'endTime', e.target.value)}
                disabled={!day.isAvailable}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
              >
                {timeOptions.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3 border-t border-gray-200 pt-3">
          <Button type="submit" size="sm" loading={isPending}>
            Save Schedule
          </Button>

          {state?.success === true && (
            <span className="text-sm font-medium text-green-600">Saved</span>
          )}
          {state?.success === false && (
            <span className="text-sm font-medium text-red-600">
              {state.error ?? 'Save failed'}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
