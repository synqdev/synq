/**
 * Transcription Service Unit Tests
 *
 * Tests transcribeRecording function: OpenAI integration,
 * segment storage, status transitions, and error handling.
 * Uses jest.fn() delegation pattern to avoid hoisting issues.
 */

// ============================================================================
// MOCKS — must be declared before imports due to jest.mock hoisting
// ============================================================================

const mockSessionFindUnique = jest.fn()
const mockSessionUpdate = jest.fn()
const mockSessionUpdateMany = jest.fn()
const mockSegmentCreateMany = jest.fn()

jest.mock('@/lib/db/client', () => ({
  prisma: {
    recordingSession: {
      findUnique: (...args: unknown[]) => mockSessionFindUnique(...args),
      update: (...args: unknown[]) => mockSessionUpdate(...args),
      updateMany: (...args: unknown[]) => mockSessionUpdateMany(...args),
    },
    transcriptionSegment: {
      createMany: (...args: unknown[]) => mockSegmentCreateMany(...args),
    },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  },
}))

const mockGetRecordingSignedUrl = jest.fn()
jest.mock('@/lib/storage/recording-storage', () => ({
  getRecordingSignedUrl: (...args: unknown[]) =>
    mockGetRecordingSignedUrl(...args),
}))

const mockTranscriptionsCreate = jest.fn()
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      audio: {
        transcriptions: {
          create: (...args: unknown[]) => mockTranscriptionsCreate(...args),
        },
      },
    })),
  }
})

const mockCaptureException = jest.fn()
jest.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}))

// Mock global fetch for downloading audio
const mockFetch = jest.fn()
global.fetch = mockFetch

import { transcribeRecording } from '../transcription.service'

// ============================================================================
// TEST DATA
// ============================================================================

const MOCK_SESSION = {
  id: 'session-1',
  audioStoragePath: 'session-1.webm',
  status: 'RECORDING',
}

const MOCK_DIARIZED_RESPONSE = {
  speakers: [
    { speaker: 'Speaker 1', text: 'こんにちは', start: 0.5, end: 1.2 },
    { speaker: 'Speaker 2', text: 'お元気ですか', start: 1.5, end: 2.8 },
    { speaker: null, text: '...', start: 3.0, end: 3.5 },
  ],
}

// ============================================================================
// TESTS
// ============================================================================

describe('transcription.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Default successful mocks
    mockGetRecordingSignedUrl.mockResolvedValue(
      'https://storage.example.com/signed-url'
    )
    mockFetch.mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    })
    mockTranscriptionsCreate.mockResolvedValue(MOCK_DIARIZED_RESPONSE)
    mockSegmentCreateMany.mockResolvedValue({ count: 3 })
    mockSessionUpdate.mockResolvedValue({})
    mockSessionUpdateMany.mockResolvedValue({ count: 1 })
  })

  describe('successful transcription', () => {
    it('downloads audio, calls OpenAI, stores segments, and updates status', async () => {
      mockSessionFindUnique.mockResolvedValue(MOCK_SESSION)

      const result = await transcribeRecording('session-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.segmentCount).toBe(3)
      }

      // Verify status transitions
      expect(mockSessionUpdateMany).toHaveBeenCalledWith({
        where: { id: 'session-1', status: 'RECORDING' },
        data: { status: 'PROCESSING' },
      })
      expect(mockSessionUpdate).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { status: 'COMPLETED' },
      })

      // Verify signed URL was fetched
      expect(mockGetRecordingSignedUrl).toHaveBeenCalledWith('session-1.webm')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://storage.example.com/signed-url'
      )

      // Verify OpenAI was called
      expect(mockTranscriptionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-transcribe-diarize',
          language: 'ja',
          response_format: 'diarized_json',
        })
      )
    })
  })

  describe('session not found', () => {
    it('returns error without calling OpenAI', async () => {
      mockSessionFindUnique.mockResolvedValue(null)

      const result = await transcribeRecording('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Recording session not found')
      }
      expect(mockTranscriptionsCreate).not.toHaveBeenCalled()
      expect(mockSessionUpdate).not.toHaveBeenCalled()
    })
  })

  describe('no audio path', () => {
    it('returns error when session has no audioStoragePath', async () => {
      mockSessionFindUnique.mockResolvedValue({
        ...MOCK_SESSION,
        audioStoragePath: null,
      })

      const result = await transcribeRecording('session-1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Recording session has no audio file')
      }
      expect(mockTranscriptionsCreate).not.toHaveBeenCalled()
      expect(mockSessionUpdate).not.toHaveBeenCalled()
    })
  })

  describe('OpenAI API error', () => {
    it('updates status to FAILED and returns error', async () => {
      mockSessionFindUnique.mockResolvedValue(MOCK_SESSION)
      mockTranscriptionsCreate.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      )

      const result = await transcribeRecording('session-1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('OpenAI API rate limit exceeded')
      }

      // Verify atomic claim was attempted
      expect(mockSessionUpdateMany).toHaveBeenCalledWith({
        where: { id: 'session-1', status: 'RECORDING' },
        data: { status: 'PROCESSING' },
      })

      // Verify status set to FAILED
      expect(mockSessionUpdate).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { status: 'FAILED' },
      })

      // Verify Sentry capture
      expect(mockCaptureException).toHaveBeenCalled()
    })
  })

  describe('segment storage', () => {
    it('maps diarized response to correct segment format', async () => {
      mockSessionFindUnique.mockResolvedValue(MOCK_SESSION)

      await transcribeRecording('session-1')

      expect(mockSegmentCreateMany).toHaveBeenCalledWith({
        data: [
          {
            recordingId: 'session-1',
            segmentIndex: 0,
            speakerLabel: 'Speaker 1',
            content: 'こんにちは',
            startMs: 500,
            endMs: 1200,
            language: 'ja',
          },
          {
            recordingId: 'session-1',
            segmentIndex: 1,
            speakerLabel: 'Speaker 2',
            content: 'お元気ですか',
            startMs: 1500,
            endMs: 2800,
            language: 'ja',
          },
          {
            recordingId: 'session-1',
            segmentIndex: 2,
            speakerLabel: null,
            content: '...',
            startMs: 3000,
            endMs: 3500,
            language: 'ja',
          },
        ],
      })
    })
  })
})
