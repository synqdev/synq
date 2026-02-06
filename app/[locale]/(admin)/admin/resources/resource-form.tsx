'use client'

/**
 * Resource Form Component
 *
 * Form for creating and editing resources (beds).
 * Uses useActionState for form handling.
 */

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createResource, updateResource } from '@/app/actions/resources'

interface Resource {
  id: string
  name: string
  isActive: boolean
}

interface ResourceFormProps {
  mode: 'create' | 'edit'
  resource?: Resource
  onCancel?: () => void
}

interface FormState {
  success: boolean
  error: string | null
}

async function createResourceAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    await createResource(formData)
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create resource' }
  }
}

async function updateResourceAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    await updateResource(formData)
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update resource' }
  }
}

export function ResourceForm({ mode, resource, onCancel }: ResourceFormProps) {
  const tCommon = useTranslations('common')
  const action = mode === 'create' ? createResourceAction : updateResourceAction
  const [state, formAction, isPending] = useActionState(action, { success: false, error: null })

  return (
    <form action={formAction} className="space-y-4">
      {resource && <input type="hidden" name="id" value={resource.id} />}

      {state.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.success && mode === 'create' && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Resource created successfully
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="name"
          label={tCommon('name')}
          defaultValue={resource?.name || ''}
          required
          placeholder="e.g., Bed 1 / ベッド1"
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-secondary-700">
            {tCommon('status')}
          </label>
          <select
            name="isActive"
            defaultValue={resource?.isActive !== false ? 'true' : 'false'}
            className="w-full rounded-lg border border-secondary-300 px-4 py-2 text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="true">{tCommon('active')}</option>
            <option value="false">{tCommon('inactive')}</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" loading={isPending}>
          {tCommon('save')}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {tCommon('cancel')}
          </Button>
        )}
      </div>
    </form>
  )
}
