'use server'

/**
 * Resource Server Actions
 *
 * Server-side handlers for resource (bed) CRUD operations:
 * - Create resource
 * - Update resource
 * - Delete resource (soft delete)
 */

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { resourceSchema } from '@/lib/validations/resource'
import { getAdminSession } from '@/lib/auth/admin'

/**
 * Create a new resource.
 *
 * @param formData - Form data with name, isActive
 * @returns Success status with created resource ID
 * @throws Error if not authenticated or validation fails
 */
export async function createResource(formData: FormData) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const raw = Object.fromEntries(formData)
  const parsed = resourceSchema.parse({
    name: raw.name,
    isActive: raw.isActive === 'true' || raw.isActive === 'on',
  })

  const resource = await prisma.resource.create({
    data: {
      name: parsed.name,
      isActive: parsed.isActive,
    },
  })

  revalidatePath('/[locale]/admin/resources', 'page')
  return { success: true, resourceId: resource.id }
}

/**
 * Update an existing resource.
 *
 * @param formData - Form data with id, name, isActive
 * @returns Success status
 * @throws Error if not authenticated or validation fails
 */
export async function updateResource(formData: FormData) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const id = formData.get('id') as string
  if (!id) throw new Error('Resource ID is required')

  const raw = Object.fromEntries(formData)
  const parsed = resourceSchema.parse({
    name: raw.name,
    isActive: raw.isActive === 'true' || raw.isActive === 'on',
  })

  await prisma.resource.update({
    where: { id },
    data: {
      name: parsed.name,
      isActive: parsed.isActive,
    },
  })

  revalidatePath('/[locale]/admin/resources', 'page')
  return { success: true }
}

/**
 * Soft delete a resource by setting isActive to false.
 *
 * Resources are soft-deleted to preserve booking history.
 *
 * @param id - UUID of the resource to delete
 * @returns Success status
 * @throws Error if not authenticated or resource not found
 */
export async function deleteResource(id: string) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  await prisma.resource.update({
    where: { id },
    data: { isActive: false },
  })

  revalidatePath('/[locale]/admin/resources', 'page')
  return { success: true }
}
