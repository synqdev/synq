'use client'

/**
 * Worker Table Component
 *
 * Displays workers in a table with edit and delete actions.
 * Uses modal for editing and confirmation for deletion.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { deleteWorker } from '@/app/actions/workers'
import { WorkerForm } from './worker-form'

interface Worker {
  id: string
  name: string
  nameEn: string | null
  isActive: boolean
  createdAt: Date
}

interface Labels {
  name: string
  nameEn: string
  status: string
  active: string
  inactive: string
  actions: string
  edit: string
  delete: string
  save: string
  cancel: string
  noWorkers: string
  confirmDelete: string
}

interface WorkerTableProps {
  workers: Worker[]
  labels: Labels
}

export function WorkerTable({ workers, labels }: WorkerTableProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`${labels.confirmDelete}\n\n${name}`)) return

    startTransition(async () => {
      await deleteWorker(id)
      router.refresh()
    })
  }

  const handleEditCancel = () => {
    setEditingId(null)
    router.refresh()
  }

  if (workers.length === 0) {
    return (
      <p className="text-center text-secondary-500 py-8">
        {labels.noWorkers}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-secondary-200 text-secondary-600">
          <tr>
            <th className="px-4 py-3 font-medium">{labels.name}</th>
            <th className="px-4 py-3 font-medium">{labels.nameEn}</th>
            <th className="px-4 py-3 font-medium">{labels.status}</th>
            <th className="px-4 py-3 font-medium text-right">{labels.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary-100">
          {workers.map((worker) => (
            <tr key={worker.id}>
              {editingId === worker.id ? (
                <td colSpan={4} className="px-4 py-4">
                  <WorkerForm
                    labels={labels}
                    mode="edit"
                    worker={worker}
                    onCancel={handleEditCancel}
                  />
                </td>
              ) : (
                <>
                  <td className="px-4 py-3 font-medium text-secondary-900">
                    {worker.name}
                  </td>
                  <td className="px-4 py-3 text-secondary-600">
                    {worker.nameEn || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        worker.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {worker.isActive ? labels.active : labels.inactive}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(worker.id)}
                      >
                        {labels.edit}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(worker.id, worker.name)}
                        disabled={isPending}
                        className="text-red-600 hover:bg-red-50"
                      >
                        {labels.delete}
                      </Button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
