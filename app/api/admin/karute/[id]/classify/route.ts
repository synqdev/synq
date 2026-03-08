/**
 * Classification API Route
 *
 * POST /api/admin/karute/[id]/classify
 *
 * Triggers AI classification of a karute record's transcription segments.
 * Uses an API route (not server action) because classification may take
 * 10-60 seconds on first request due to OpenAI schema caching.
 *
 * Requires admin authentication.
 */

import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { classifyAndStoreEntries } from '@/lib/services/classification.service'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const result = await classifyAndStoreEntries(id)

    if (result.success) {
      return NextResponse.json({
        success: true,
        entryCount: result.entryCount,
      })
    }

    return NextResponse.json({ error: result.error }, { status: 500 })
  } catch (error) {
    console.error('[karute/classify] Classification failed', {
      error,
      karuteRecordId: id,
    })
    return NextResponse.json(
      { error: 'Classification failed' },
      { status: 500 }
    )
  }
}
