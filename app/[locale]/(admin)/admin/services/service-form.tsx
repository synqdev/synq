'use client'

/**
 * Service Form Component
 *
 * Form for creating and editing services.
 * Uses useActionState for form handling.
 */

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createService, updateService } from '@/app/actions/services'

interface Service {
  id: string
  name: string
  nameEn: string | null
  description: string | null
  duration: number
  price: number
  isActive: boolean
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
  save: string
  cancel: string
}

interface ServiceFormProps {
  labels: Labels
  mode: 'create' | 'edit'
  service?: Service
  onCancel?: () => void
}

interface FormState {
  success: boolean
  error: string | null
}

async function createServiceAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    await createService(formData)
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create service' }
  }
}

async function updateServiceAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    await updateService(formData)
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update service' }
  }
}

export function ServiceForm({ labels, mode, service, onCancel }: ServiceFormProps) {
  const action = mode === 'create' ? createServiceAction : updateServiceAction
  const [state, formAction, isPending] = useActionState(action, { success: false, error: null })

  return (
    <form action={formAction} className="space-y-4">
      {service && <input type="hidden" name="id" value={service.id} />}

      {state.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.success && mode === 'create' && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Service created successfully
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="name"
          label={labels.name}
          defaultValue={service?.name || ''}
          required
          placeholder="e.g., 指圧"
        />

        <Input
          name="nameEn"
          label={labels.nameEn}
          defaultValue={service?.nameEn || ''}
          placeholder="e.g., Shiatsu"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-secondary-700">
          {labels.description}
        </label>
        <textarea
          name="description"
          defaultValue={service?.description || ''}
          className="w-full rounded-lg border border-secondary-300 px-4 py-2 text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={3}
          maxLength={500}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          type="number"
          name="duration"
          label={`${labels.duration} (${labels.durationUnit})`}
          defaultValue={service?.duration || 60}
          required
          min={1}
        />

        <Input
          type="number"
          name="price"
          label={`${labels.price} (¥)`}
          defaultValue={service?.price || 0}
          required
          min={0}
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-secondary-700">
            {labels.status}
          </label>
          <select
            name="isActive"
            defaultValue={service?.isActive !== false ? 'true' : 'false'}
            className="w-full rounded-lg border border-secondary-300 px-4 py-2 text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="true">{labels.active}</option>
            <option value="false">{labels.inactive}</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" loading={isPending}>
          {labels.save}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {labels.cancel}
          </Button>
        )}
      </div>
    </form>
  )
}
