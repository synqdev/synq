import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { uploadIntakeForm, deleteIntakeForm } from '@/lib/storage/supabase-storage'
import {
  createMedicalRecord,
  getMedicalRecordsWithSignedUrls,
  deleteMedicalRecord,
} from '@/lib/services/medical-record.service'
import { prisma } from '@/lib/db/client'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

async function getOrCreateIntakeItem() {
  return prisma.medicalRecordItem.upsert({
    where: { title: 'Intake Form' },
    update: {},
    create: {
      title: 'Intake Form',
      contentType: 'IMAGE',
      isPublic: false,
      displayOrder: 0,
    },
  })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const records = await getMedicalRecordsWithSignedUrls(id)

  return NextResponse.json({ records })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: customerId } = await params

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Allowed: PDF, JPG, PNG, WEBP' },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum size: 10MB' },
      { status: 400 }
    )
  }

  let path: string | null = null
  try {
    const item = await getOrCreateIntakeItem()
    const upload = await uploadIntakeForm(customerId, file)
    path = upload.path
    const record = await createMedicalRecord({
      customerId,
      itemId: item.id,
      imageUrl: path,
      enteredBy: 'admin',
    })
    return NextResponse.json({ record }, { status: 201 })
  } catch {
    if (path) await deleteIntakeForm(path).catch(() => undefined)
    return NextResponse.json({ error: 'Failed to upload intake form' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: customerId } = await params
  const { searchParams } = request.nextUrl
  const recordId = searchParams.get('recordId')

  if (!recordId) {
    return NextResponse.json({ error: 'recordId is required' }, { status: 400 })
  }

  const record = await prisma.medicalRecord.findUnique({
    where: { id: recordId },
    select: { customerId: true },
  })

  if (!record || record.customerId !== customerId) {
    return NextResponse.json({ error: 'Record not found' }, { status: 404 })
  }

  try {
    await deleteMedicalRecord(recordId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
  }
}
