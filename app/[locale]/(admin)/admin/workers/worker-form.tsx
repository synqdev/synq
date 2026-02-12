'use client'

/**
 * Worker Form Component
 *
 * Form for creating and editing workers.
 * Uses useActionState for form handling.
 */

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createWorker, updateWorker } from '@/app/actions/workers'

interface Worker {
  id: string
  name: string
  nameEn: string | null
  isActive: boolean
}

interface Labels {
  name: string
  nameEn: string
  status: string
  active: string
  inactive: string
  save: string
  cancel: string
}

interface WorkerFormProps {
  labels: Labels
  mode: 'create' | 'edit'
  worker?: Worker
  onCancel?: () => void
}

interface FormState {
  success: boolean
  error: string | null
}

async function createWorkerAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    await createWorker(formData)
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create worker' }
  }
}

async function updateWorkerAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    await updateWorker(formData)
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update worker' }
  }
}

export function WorkerForm({ labels, mode, worker, onCancel }: WorkerFormProps) {
  const action = mode === 'create' ? createWorkerAction : updateWorkerAction
  const [state, formAction, isPending] = useActionState(action, { success: false, error: null })

  return (
    <form action={formAction} className="space-y-4">
      {worker && <input type="hidden" name="id" value={worker.id} />}

      {state.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.success && mode === 'create' && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Worker created successfully
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="name"
          label={labels.name}
          defaultValue={worker?.name || ''}
          required
          placeholder="e.g., 田中"
        />

        <Input
          name="nameEn"
          label={labels.nameEn}
          defaultValue={worker?.nameEn || ''}
          placeholder="e.g., Tanaka"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-secondary-700">
          {labels.status}
        </label>
        <select
          name="isActive"
          defaultValue={worker?.isActive !== false ? 'true' : 'false'}
          className="w-full rounded-lg border border-secondary-300 px-4 py-2 text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="true">{labels.active}</option>
          <option value="false">{labels.inactive}</option>
        </select>
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
