/**
 * Admin Settings API
 *
 * GET: Read current admin settings (creates default row if none exists)
 * PUT: Update admin settings with Zod validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth/admin'
import { z } from 'zod'

const settingsSchema = z.object({
  aiProvider: z.string().min(1),
  businessType: z.string().min(1),
  autoTranscribe: z.boolean(),
  recordingLang: z.string().min(1),
  audioQuality: z.string().min(1),
})

/**
 * GET /api/admin/settings
 *
 * Returns current admin settings. If no settings row exists,
 * creates a default one and returns it (upsert pattern).
 */
export async function GET() {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await prisma.adminSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default' },
    update: {},
  })

  return NextResponse.json(settings)
}

/**
 * PUT /api/admin/settings
 *
 * Updates admin settings. Validates request body with Zod schema.
 * Uses upsert to handle case where no settings row exists yet.
 */
export async function PUT(request: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const settings = await prisma.adminSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      ...parsed.data,
    },
    update: parsed.data,
  })

  return NextResponse.json(settings)
}
