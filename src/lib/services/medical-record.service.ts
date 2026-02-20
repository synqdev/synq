import { prisma } from '@/lib/db/client'
import { deleteIntakeForm, getSignedUrl } from '@/lib/storage/supabase-storage'

export async function createMedicalRecord(data: {
  customerId: string
  itemId: string
  content?: string
  imageUrl?: string
  enteredBy: string
}) {
  if (!data.content && !data.imageUrl) {
    throw new Error('At least one of content or imageUrl must be provided')
  }

  return prisma.medicalRecord.create({
    data: {
      customerId: data.customerId,
      itemId: data.itemId,
      content: data.content,
      imageUrl: data.imageUrl,
      enteredBy: data.enteredBy,
    },
    include: {
      item: true,
    },
  })
}

export async function getMedicalRecords(customerId: string) {
  return prisma.medicalRecord.findMany({
    where: { customerId },
    orderBy: { enteredAt: 'desc' },
    include: {
      item: {
        select: {
          id: true,
          title: true,
          contentType: true,
        },
      },
    },
  })
}

export async function getMedicalRecordsWithSignedUrls(customerId: string) {
  const records = await getMedicalRecords(customerId)

  const recordsWithUrls = await Promise.all(
    records.map(async (record) => {
      let signedUrl: string | null = null
      if (record.imageUrl) {
        try {
          signedUrl = await getSignedUrl(record.imageUrl)
        } catch {
          signedUrl = null
        }
      }
      return {
        id: record.id,
        customerId: record.customerId,
        content: record.content,
        imageUrl: record.imageUrl,
        signedUrl,
        enteredBy: record.enteredBy,
        enteredAt: record.enteredAt.toISOString(),
        item: record.item,
      }
    })
  )

  return recordsWithUrls
}

export async function deleteMedicalRecord(id: string) {
  const record = await prisma.medicalRecord.findUnique({
    where: { id },
  })

  if (!record) throw new Error('Record not found')

  await prisma.medicalRecord.delete({
    where: { id },
  })

  if (record.imageUrl) {
    try {
      await deleteIntakeForm(record.imageUrl)
    } catch (error) {
      console.warn('Failed to delete intake form from storage', { id, path: record.imageUrl, error })
    }
  }
}
