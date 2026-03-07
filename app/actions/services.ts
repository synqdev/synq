'use server'

/**
 * Service Server Actions
 *
 * Server-side handlers for service CRUD operations:
 * - Create service
 * - Update service
 * - Delete service (soft delete)
 */

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { serviceSchema } from '@/lib/validations/service'
import { getAdminSession } from '@/lib/auth/admin'

/**
 * Create a new service.
 *
 * @param formData - Form data with name, nameEn, description, duration, price, isActive
 * @returns Success status with created service ID
 * @throws Error if not authenticated or validation fails
 */
export async function createService(formData: FormData) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const raw = Object.fromEntries(formData)
  const parsed = serviceSchema.parse({
    name: raw.name,
    nameEn: raw.nameEn || undefined,
    description: raw.description || undefined,
    duration: raw.duration,
    price: raw.price,
    isActive: raw.isActive === 'true' || raw.isActive === 'on',
  })

  const service = await prisma.service.create({
    data: {
      name: parsed.name,
      nameEn: parsed.nameEn || null,
      description: parsed.description || null,
      duration: parsed.duration,
      price: parsed.price,
      isActive: parsed.isActive,
    },
  })

  revalidatePath('/[locale]/admin/services', 'page')
  return { success: true, serviceId: service.id }
}

/**
 * Update an existing service.
 *
 * @param formData - Form data with id, name, nameEn, description, duration, price, isActive
 * @returns Success status
 * @throws Error if not authenticated or validation fails
 */
export async function updateService(formData: FormData) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  const id = formData.get('id') as string
  if (!id) throw new Error('Service ID is required')

  const raw = Object.fromEntries(formData)
  const parsed = serviceSchema.parse({
    name: raw.name,
    nameEn: raw.nameEn || undefined,
    description: raw.description || undefined,
    duration: raw.duration,
    price: raw.price,
    isActive: raw.isActive === 'true' || raw.isActive === 'on',
  })

  await prisma.service.update({
    where: { id },
    data: {
      name: parsed.name,
      nameEn: parsed.nameEn || null,
      description: parsed.description || null,
      duration: parsed.duration,
      price: parsed.price,
      isActive: parsed.isActive,
    },
  })

  revalidatePath('/[locale]/admin/services', 'page')
  return { success: true }
}

/**
 * Soft delete a service by setting isActive to false.
 *
 * Services are soft-deleted to preserve booking history.
 *
 * @param id - UUID of the service to delete
 * @returns Success status
 * @throws Error if not authenticated or service not found
 */
export async function deleteService(id: string) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) throw new Error('Unauthorized')

  await prisma.service.update({
    where: { id },
    data: { isActive: false },
  })

  revalidatePath('/[locale]/admin/services', 'page')
  return { success: true }
}
