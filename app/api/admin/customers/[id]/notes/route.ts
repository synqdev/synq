import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { findCustomerById, updateCustomerFields } from '@/lib/services/customer.service'
import { updateCustomerNotesSchema } from '@/lib/validations/customer'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Pre-check customer exists before attempting updates
  const existing = await findCustomerById(id)
  if (!existing) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = updateCustomerNotesSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { notes, assignedStaffId } = parsed.data

  const updateData: { notes?: string; assignedStaffId?: string | null } = {}
  if (notes !== undefined) updateData.notes = notes
  if (assignedStaffId !== undefined) updateData.assignedStaffId = assignedStaffId

  if (Object.keys(updateData).length > 0) {
    await updateCustomerFields(id, updateData)
  }

  return NextResponse.json({ success: true })
}
