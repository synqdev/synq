'use client'

/**
 * Service Table Component
 *
 * Displays services in a table with edit and delete actions.
 * Uses inline editing and confirmation for deletion.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { deleteService } from '@/app/actions/services'
import { ServiceForm } from './service-form'

interface Service {
  id: string
  name: string
  nameEn: string | null
  description: string | null
  duration: number
  price: number
  isActive: boolean
  createdAt: Date
}

interface Labels {
  name: string
  nameEn: string
  description: string
  duration: string
  durationUnit: string
  price: string
  status: string
  active: string
  inactive: string
  actions: string
  edit: string
  delete: string
  save: string
  cancel: string
  noServices: string
  confirmDelete: string
}

interface ServiceTableProps {
  services: Service[]
  labels: Labels
}

/**
 * Format price as Japanese Yen
 */
function formatPrice(price: number): string {
  return `¥${price.toLocaleString('ja-JP')}`
}

/**
 * Format duration as minutes
 */
function formatDuration(minutes: number, unit: string): string {
  return `${minutes} ${unit}`
}

export function ServiceTable({ services, labels }: ServiceTableProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`${labels.confirmDelete}\n\n${name}`)) return

    startTransition(async () => {
      await deleteService(id)
      router.refresh()
    })
  }

  const handleEditCancel = () => {
    setEditingId(null)
    router.refresh()
  }

  if (services.length === 0) {
    return (
      <p className="text-center text-secondary-500 py-8">
        {labels.noServices}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-secondary-200 text-secondary-600">
          <tr>
            <th className="px-4 py-3 font-medium">{labels.name}</th>
            <th className="px-4 py-3 font-medium">{labels.duration}</th>
            <th className="px-4 py-3 font-medium">{labels.price}</th>
            <th className="px-4 py-3 font-medium">{labels.status}</th>
            <th className="px-4 py-3 font-medium text-right">{labels.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary-100">
          {services.map((service) => (
            <tr key={service.id}>
              {editingId === service.id ? (
                <td colSpan={5} className="px-4 py-4">
                  <ServiceForm
                    labels={labels}
                    mode="edit"
                    service={service}
                    onCancel={handleEditCancel}
                  />
                </td>
              ) : (
                <>
                  <td className="px-4 py-3">
                    <div className="font-medium text-secondary-900">{service.name}</div>
                    {service.nameEn && (
                      <div className="text-secondary-500 text-xs">{service.nameEn}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-secondary-600">
                    {formatDuration(service.duration, labels.durationUnit)}
                  </td>
                  <td className="px-4 py-3 text-secondary-600">
                    {formatPrice(service.price)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        service.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {service.isActive ? labels.active : labels.inactive}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(service.id)}
                      >
                        {labels.edit}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(service.id, service.name)}
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
