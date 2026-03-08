'use client'

import { Fragment, useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { deleteWorker } from '@/app/actions/workers'
import { WorkerForm } from './worker-form'
import { ScheduleEditor } from './schedule-editor'

interface Worker {
  id: string
  name: string
  nameEn: string | null
  isActive: boolean
  createdAt: Date
}

interface DaySchedule {
  dayOfWeek: number
  startTime: string
  endTime: string
  isAvailable: boolean
}

interface WorkerTableProps {
  workers: Worker[]
}

const DEFAULT_SCHEDULES: DaySchedule[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  startTime: '09:00',
  endTime: '18:00',
  isAvailable: false,
}))

export function WorkerTable({ workers }: WorkerTableProps) {
  const router = useRouter()
  const tCommon = useTranslations('common')
  const tWorkers = useTranslations('admin.workersPage')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [scheduleId, setScheduleId] = useState<string | null>(null)
  const [scheduleData, setScheduleData] = useState<DaySchedule[]>(DEFAULT_SCHEDULES)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!scheduleId) return
    setScheduleLoading(true)
    fetch(`/api/admin/workers/${scheduleId}/schedule`)
      .then((res) => res.json())
      .then((data) => {
        if (data.schedules) {
          setScheduleData(data.schedules)
        } else {
          setScheduleData(DEFAULT_SCHEDULES)
        }
      })
      .catch(() => setScheduleData(DEFAULT_SCHEDULES))
      .finally(() => setScheduleLoading(false))
  }, [scheduleId])

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`${tWorkers('confirmDelete')}\n\n${name}`)) return

    startTransition(async () => {
      await deleteWorker(id)
      router.refresh()
    })
  }

  const handleEditCancel = () => {
    setEditingId(null)
    router.refresh()
  }

  const toggleSchedule = (workerId: string) => {
    if (scheduleId === workerId) {
      setScheduleId(null)
    } else {
      setEditingId(null)
      setScheduleLoading(true)
      setScheduleId(workerId)
    }
  }

  if (workers.length === 0) {
    return (
      <p className="text-center text-secondary-500 py-8">
        {tWorkers('notFound')}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-300 text-gray-700">
          <tr>
            <th className="px-4 py-3 font-medium">{tCommon('name')}</th>
            <th className="px-4 py-3 font-medium">{tCommon('nameEn')}</th>
            <th className="px-4 py-3 font-medium">{tCommon('status')}</th>
            <th className="px-4 py-3 font-medium text-right">{tCommon('actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {workers.map((worker) => (
            <Fragment key={worker.id}>
              <tr className="group">
                {editingId === worker.id ? (
                  <td colSpan={4} className="px-4 py-4">
                    <WorkerForm
                      mode="edit"
                      worker={worker}
                      onCancel={handleEditCancel}
                    />
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {worker.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {worker.nameEn || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${worker.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {worker.isActive ? tCommon('active') : tCommon('inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleSchedule(worker.id)}
                          className={scheduleId === worker.id ? 'bg-primary-50 border-primary-300' : ''}
                        >
                          Schedule
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setScheduleId(null)
                            setEditingId(worker.id)
                          }}
                        >
                          {tCommon('edit')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(worker.id, worker.name)}
                          disabled={isPending}
                          className="text-red-600 hover:bg-red-50"
                        >
                          {tCommon('delete')}
                        </Button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
              {scheduleId === worker.id && editingId !== worker.id && (
                <tr>
                  <td colSpan={4} className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                    {scheduleLoading ? (
                      <p className="text-sm text-gray-500">Loading schedule...</p>
                    ) : (
                      <ScheduleEditor
                        workerId={worker.id}
                        workerName={worker.name}
                        initialSchedules={scheduleData}
                        onClose={() => setScheduleId(null)}
                      />
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
