import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { updateCustomerNotes, updateCustomerAssignedStaff } from '@/lib/services/customer.service'
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
  const body = await request.json()
  const parsed = updateCustomerNotesSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { notes, assignedStaffId } = parsed.data

  if (notes !== undefined) {
    await updateCustomerNotes(id, notes)
  }

  if (assignedStaffId !== undefined) {
    await updateCustomerAssignedStaff(id, assignedStaffId)
  }

  return NextResponse.json({ success: true })
}
