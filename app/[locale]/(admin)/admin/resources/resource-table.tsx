'use client'

/**
 * Resource Table Component
 *
 * Displays resources in a table with edit and delete actions.
 * Uses inline editing and confirmation for deletion.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { deleteResource } from '@/app/actions/resources'
import { ResourceForm } from './resource-form'

interface Resource {
  id: string
  name: string
  isActive: boolean
  createdAt: Date
}

interface ResourceTableProps {
  resources: Resource[]
}

export function ResourceTable({ resources }: ResourceTableProps) {
  const router = useRouter()
  const tCommon = useTranslations('common')
  const tResources = useTranslations('admin.resourcesPage')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`${tResources('confirmDelete')}\n\n${name}`)) return

    startTransition(async () => {
      await deleteResource(id)
      router.refresh()
    })
  }

  const handleEditCancel = () => {
    setEditingId(null)
    router.refresh()
  }

  if (resources.length === 0) {
    return (
      <p className="text-center text-secondary-500 py-8">
        {tResources('notFound')}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-secondary-200 text-secondary-600">
          <tr>
            <th className="px-4 py-3 font-medium">{tCommon('name')}</th>
            <th className="px-4 py-3 font-medium">{tCommon('status')}</th>
            <th className="px-4 py-3 font-medium text-right">{tCommon('actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary-100">
          {resources.map((resource) => (
            <tr key={resource.id}>
              {editingId === resource.id ? (
                <td colSpan={3} className="px-4 py-4">
                  <ResourceForm
                    mode="edit"
                    resource={resource}
                    onCancel={handleEditCancel}
                  />
                </td>
              ) : (
                <>
                  <td className="px-4 py-3 font-medium text-secondary-900">
                    {resource.name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${resource.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                        }`}
                    >
                      {resource.isActive ? tCommon('active') : tCommon('inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(resource.id)}
                      >
                        {tCommon('edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(resource.id, resource.name)}
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
