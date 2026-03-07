'use client'

/**
 * Worker Table Component
 *
 * Displays workers in a table with edit and delete actions.
 * Uses modal for editing and confirmation for deletion.
 */

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { deleteWorker } from '@/app/actions/workers'
import { WorkerForm } from './worker-form'
import { ScheduleEditor } from './schedule-editor'
import { type DaySchedule, DEFAULT_SCHEDULES } from '@/lib/types/worker-schedule'

interface Worker {
  id: string
  name: string
  nameEn: string | null
  isActive: boolean
  createdAt: Date
}

interface WorkerTableProps {
  workers: Worker[]
}

export function WorkerTable({ workers }: WorkerTableProps) {
  const router = useRouter()
  const locale = useLocale()
  const tCommon = useTranslations('common')
  const tWorkers = useTranslations('admin.workersPage')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [scheduleId, setScheduleId] = useState<string | null>(null)
  const [scheduleData, setScheduleData] = useState<DaySchedule[]>(DEFAULT_SCHEDULES)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!scheduleId) return
    const controller = new AbortController()
    setScheduleLoading(true)
    fetch(`/api/admin/workers/${scheduleId}/schedule`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.schedules) {
          setScheduleData(data.schedules)
        } else {
          setScheduleData(DEFAULT_SCHEDULES)
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setScheduleData(DEFAULT_SCHEDULES)
        }
      })
      .finally(() => setScheduleLoading(false))
    return () => controller.abort()
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
                  <td className="px-4 py-3 text-secondary-600">
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
                      <Link
                        href={`/${locale}/admin/workers/${worker.id}/schedule`}
                        className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:text-primary-800 transition-colors"
                      >
                        {tWorkers('schedule')}
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(worker.id)}
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
                          {tCommon('schedule')}
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
                      <p className="text-sm text-gray-500">{tCommon('loading')}</p>
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
