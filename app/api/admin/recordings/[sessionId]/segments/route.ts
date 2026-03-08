/**
 * Recording Segments API Route
 *
 * GET /api/admin/recordings/[sessionId]/segments
 *
 * Returns transcription segments for a recording session.
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { getRecordingSession } from '@/lib/services/recording.service'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params

  const result = await getRecordingSession(sessionId)

  if (!result.success) {
    const isNotFound = result.error?.toLowerCase().includes('not found')
    return NextResponse.json(
      { error: result.error },
      { status: isNotFound ? 404 : 500 }
    )
  }

  const segments = result.data.segments.map((seg) => ({
    segmentIndex: seg.segmentIndex,
    speakerLabel: seg.speakerLabel,
    content: seg.content,
    startMs: seg.startMs,
    endMs: seg.endMs,
  }))

  return NextResponse.json({ segments })
}
