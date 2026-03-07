/**
 * Audio Upload API Route
 *
 * POST /api/admin/recordings/upload
 *
 * Accepts audio file uploads with MIME type and size validation.
 * Uploads to Supabase Storage and persists the storage path on the recording session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { uploadRecording } from '@/lib/storage/recording-storage'
import { updateRecordingSession } from '@/lib/services/recording.service'

const ALLOWED_TYPES = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg']
const MAX_SIZE = 100 * 1024 * 1024 // 100MB

export async function POST(request: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const recordingSessionId = formData.get('recordingSessionId') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!recordingSessionId) {
    return NextResponse.json({ error: 'recordingSessionId is required' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  try {
    const result = await uploadRecording(recordingSessionId, file)

    await updateRecordingSession({
      id: recordingSessionId,
      audioStoragePath: result.path,
    })

    return NextResponse.json({ success: true, path: result.path })
  } catch (error) {
    console.error('[recordings/upload] Upload failed', { error, recordingSessionId })
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
