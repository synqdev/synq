/**
 * Transcription API Route
 *
 * POST /api/admin/recordings/transcribe
 *
 * Triggers transcription of a recording session via OpenAI.
 * Requires admin authentication and a valid recordingSessionId.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { transcribeRecording } from '@/lib/services/transcription.service'

export async function POST(request: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { recordingSessionId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { recordingSessionId } = body
  if (!recordingSessionId) {
    return NextResponse.json(
      { error: 'recordingSessionId is required' },
      { status: 400 }
    )
  }

  try {
    const result = await transcribeRecording(recordingSessionId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        segmentCount: result.data.segmentCount,
      })
    }

    const status =
      result.error === 'Recording session not found'
        ? 404
        : result.error === 'Recording session has no audio file'
          ? 409
          : result.error?.includes('already being transcribed')
            ? 409
            : 500

    return NextResponse.json({ error: result.error }, { status })
  } catch (error) {
    console.error('[recordings/transcribe] Transcription failed', {
      error,
      recordingSessionId,
    })
    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 500 }
    )
  }
}
