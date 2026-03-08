/**
 * @jest-environment node
 */

/**
 * Recording & Transcription Integration Tests (Phase 4)
 *
 * Tests the transcription service integration scenarios, audio utility,
 * and API routes. All external dependencies (Prisma, OpenAI, Supabase)
 * are mocked. Complements the existing transcription.service.test.ts
 * by covering API routes, audio utilities, and additional edge cases.
 */

// ============================================================================
// MOCKS — use jest.fn() delegation pattern to avoid hoisting issues
// ============================================================================

const mockSessionFindUnique = jest.fn();
const mockSessionUpdate = jest.fn();
const mockSessionUpdateMany = jest.fn();
const mockSegmentCreateMany = jest.fn();
const mockTransaction = jest.fn();

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
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

const mockGetRecordingSignedUrl = jest.fn();
jest.mock('@/lib/storage/recording-storage', () => ({
  getRecordingSignedUrl: (...args: unknown[]) =>
    mockGetRecordingSignedUrl(...args),
}));

const mockTranscriptionsCreate = jest.fn();
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: (...args: unknown[]) => mockTranscriptionsCreate(...args),
      },
    },
  })),
}));

const mockCaptureException = jest.fn();
jest.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

const mockGetAdminSession = jest.fn();
jest.mock('@/lib/auth/admin', () => ({
  getAdminSession: (...args: unknown[]) => mockGetAdminSession(...args),
}));

const mockGetRecordingSession = jest.fn();
jest.mock('@/lib/services/recording.service', () => ({
  getRecordingSession: (...args: unknown[]) =>
    mockGetRecordingSession(...args),
}));

const mockTranscribeRecording = jest.fn();
jest.mock('@/lib/services/transcription.service', () => ({
  transcribeRecording: (...args: unknown[]) =>
    mockTranscribeRecording(...args),
}));

// Mock global fetch for audio download
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ============================================================================
// IMPORTS
// ============================================================================

import { NextRequest } from 'next/server';

// ============================================================================
// TRANSCRIPTION SERVICE — additional integration scenarios
// ============================================================================

describe('Transcription Service (integration scenarios)', () => {
  let transcribeRecording: typeof import('@/lib/services/transcription.service').transcribeRecording;

  beforeAll(async () => {
    jest.unmock('@/lib/services/transcription.service');
    jest.resetModules();
    // Re-apply mocks for the real module's dependencies
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
        $transaction: (...args: unknown[]) => mockTransaction(...args),
      },
    }));
    jest.mock('@/lib/storage/recording-storage', () => ({
      getRecordingSignedUrl: (...args: unknown[]) =>
        mockGetRecordingSignedUrl(...args),
    }));
    jest.mock('openai', () => ({
      __esModule: true,
      default: jest.fn().mockImplementation(() => ({
        audio: {
          transcriptions: {
            create: (...args: unknown[]) => mockTranscriptionsCreate(...args),
          },
        },
      })),
    }));
    jest.mock('@sentry/nextjs', () => ({
      captureException: (...args: unknown[]) => mockCaptureException(...args),
    }));

    const mod = await import('../transcription.service');
    transcribeRecording = mod.transcribeRecording;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Set OPENAI_API_KEY for tests
    process.env.OPENAI_API_KEY = 'test-key';
    // Default mocks for happy path
    mockGetRecordingSignedUrl.mockResolvedValue(
      'https://storage.example.com/signed-url'
    );
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });
    mockSegmentCreateMany.mockResolvedValue({ count: 2 });
    mockSessionUpdate.mockResolvedValue({});
    mockSessionUpdateMany.mockResolvedValue({ count: 1 });
    mockTransaction.mockImplementation((ops: unknown[]) => Promise.all(ops));
  });

  const sessionId = '00000000-0000-0000-0000-000000000001';
  const mockSession = {
    id: sessionId,
    audioStoragePath: 'recordings/test.webm',
    status: 'RECORDING',
  };

  it('handles missing session gracefully', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(null);

    const result = await transcribeRecording(sessionId);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Recording session not found');
    }
    // Should not attempt any updates
    expect(mockSessionUpdate).not.toHaveBeenCalled();
    expect(mockSessionUpdateMany).not.toHaveBeenCalled();
  });

  it('handles session with no audio URL', async () => {
    mockSessionFindUnique.mockResolvedValueOnce({
      ...mockSession,
      audioStoragePath: null,
    });

    const result = await transcribeRecording(sessionId);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Recording session has no audio file');
    }
    expect(mockSessionUpdateMany).not.toHaveBeenCalled();
  });

  it('handles session already processing/completed via atomic claim pattern', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockSession);
    // Atomic claim fails — session already claimed
    mockSessionUpdateMany.mockResolvedValueOnce({ count: 0 });

    const result = await transcribeRecording(sessionId);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('already being transcribed');
    }
    // updateMany was called with atomic claim pattern
    expect(mockSessionUpdateMany).toHaveBeenCalledWith({
      where: { id: sessionId, status: 'RECORDING' },
      data: { status: 'PROCESSING' },
    });
  });

  it('transitions RECORDING -> PROCESSING -> COMPLETED on success', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockSession);
    mockTranscriptionsCreate.mockResolvedValueOnce({
      speakers: [
        { speaker: 'A', text: 'Hello', start: 0.0, end: 1.5 },
        { speaker: 'B', text: 'Hi there', start: 1.5, end: 3.0 },
      ],
    });

    const result = await transcribeRecording(sessionId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.segmentCount).toBe(2);
    }

    // Verify atomic claim pattern set PROCESSING
    expect(mockSessionUpdateMany).toHaveBeenCalledWith({
      where: { id: sessionId, status: 'RECORDING' },
      data: { status: 'PROCESSING' },
    });

    // Verify $transaction was called for segments + COMPLETED status
    expect(mockTransaction).toHaveBeenCalled();
  });

  it('transitions RECORDING -> PROCESSING -> FAILED on error', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockSession);
    mockGetRecordingSignedUrl.mockRejectedValueOnce(
      new Error('Storage unavailable')
    );

    const result = await transcribeRecording(sessionId);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Storage unavailable');
    }

    // Verify PROCESSING was set first via atomic claim
    expect(mockSessionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'PROCESSING' },
      })
    );

    // Verify FAILED was set on error
    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'FAILED' },
      })
    );
  });

  it('stores segments with correct fields (segmentIndex, speakerLabel, content, startMs, endMs)', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockSession);
    mockTranscriptionsCreate.mockResolvedValueOnce({
      speakers: [
        { speaker: 'A', text: 'First segment', start: 0.0, end: 2.5 },
        { speaker: 'B', text: 'Second segment', start: 2.5, end: 5.0 },
      ],
    });

    await transcribeRecording(sessionId);

    // Verify segments were passed to createMany via $transaction
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockSegmentCreateMany).toHaveBeenCalledWith({
      data: [
        {
          recordingId: sessionId,
          segmentIndex: 0,
          speakerLabel: 'A',
          content: 'First segment',
          startMs: 0,
          endMs: 2500,
          language: 'ja',
        },
        {
          recordingId: sessionId,
          segmentIndex: 1,
          speakerLabel: 'B',
          content: 'Second segment',
          startMs: 2500,
          endMs: 5000,
          language: 'ja',
        },
      ],
    });
  });

  it('handles OpenAI response with "segments" field instead of "speakers"', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(mockSession);
    mockTranscriptionsCreate.mockResolvedValueOnce({
      segments: [
        { speaker: null, text: 'Fallback segment', start: 0.0, end: 1.0 },
      ],
    });

    const result = await transcribeRecording(sessionId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.segmentCount).toBe(1);
    }

    expect(mockSegmentCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          speakerLabel: null,
          content: 'Fallback segment',
        }),
      ],
    });
  });
});

// ============================================================================
// AUDIO UTILITY TESTS (getSupportedMimeType)
// ============================================================================

describe('Audio Utility (getSupportedMimeType)', () => {
  let getSupportedMimeType: typeof import('@/lib/utils/audio').getSupportedMimeType;

  beforeAll(async () => {
    const mod = await import('@/lib/utils/audio');
    getSupportedMimeType = mod.getSupportedMimeType;
  });

  afterEach(() => {
    // @ts-expect-error -- cleanup global mock
    delete global.MediaRecorder;
  });

  it('returns a valid MIME type when supported', () => {
    const mockIsTypeSupported = jest.fn(
      (type: string) => type === 'audio/webm;codecs=opus'
    );
    // @ts-expect-error -- mocking browser API in node environment
    global.MediaRecorder = { isTypeSupported: mockIsTypeSupported };

    const result = getSupportedMimeType();
    expect(result).toBe('audio/webm;codecs=opus');
  });

  it('returns the first supported type in priority order', () => {
    const mockIsTypeSupported = jest.fn((type: string) => type === 'audio/webm');
    // @ts-expect-error -- mocking browser API in node environment
    global.MediaRecorder = { isTypeSupported: mockIsTypeSupported };

    const result = getSupportedMimeType();
    expect(result).toBe('audio/webm');
    // Should have tried webm;codecs=opus first (not supported)
    expect(mockIsTypeSupported).toHaveBeenCalledWith('audio/webm;codecs=opus');
  });

  it('returns mp4 when webm types are not supported (Safari fallback)', () => {
    const mockIsTypeSupported = jest.fn((type: string) => type === 'audio/mp4');
    // @ts-expect-error -- mocking browser API in node environment
    global.MediaRecorder = { isTypeSupported: mockIsTypeSupported };

    const result = getSupportedMimeType();
    expect(result).toBe('audio/mp4');
  });

  it('throws when no MIME type is supported', () => {
    const mockIsTypeSupported = jest.fn(() => false);
    // @ts-expect-error -- mocking browser API in node environment
    global.MediaRecorder = { isTypeSupported: mockIsTypeSupported };

    expect(() => getSupportedMimeType()).toThrow(
      'No supported audio MIME type found'
    );
  });
});

// ============================================================================
// TRANSCRIBE API ROUTE TESTS
// ============================================================================

describe('POST /api/admin/recordings/transcribe', () => {
  let POST: typeof import('../../../../app/api/admin/recordings/transcribe/route').POST;

  beforeAll(async () => {
    // Re-mock the transcription service for route tests
    jest.mock('@/lib/services/transcription.service', () => ({
      transcribeRecording: (...args: unknown[]) =>
        mockTranscribeRecording(...args),
    }));

    const routeModule = await import(
      '../../../../app/api/admin/recordings/transcribe/route'
    );
    POST = routeModule.POST;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest('http://localhost/api/admin/recordings/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 401 without auth', async () => {
    mockGetAdminSession.mockResolvedValueOnce(false);

    const response = await POST(makeRequest({ recordingSessionId: 'test-id' }));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when recordingSessionId is missing', async () => {
    mockGetAdminSession.mockResolvedValueOnce(true);

    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('recordingSessionId is required');
  });

  it('returns 200 with segment count on success', async () => {
    mockGetAdminSession.mockResolvedValueOnce(true);
    mockTranscribeRecording.mockResolvedValueOnce({
      success: true,
      data: { segmentCount: 5 },
    });

    const response = await POST(
      makeRequest({ recordingSessionId: 'session-123' })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.segmentCount).toBe(5);
  });

  it('returns 404 for missing session', async () => {
    mockGetAdminSession.mockResolvedValueOnce(true);
    mockTranscribeRecording.mockResolvedValueOnce({
      success: false,
      error: 'Recording session not found',
    });

    const response = await POST(
      makeRequest({ recordingSessionId: 'missing-id' })
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Recording session not found');
  });

  it('returns 409 when session is already being transcribed', async () => {
    mockGetAdminSession.mockResolvedValueOnce(true);
    mockTranscribeRecording.mockResolvedValueOnce({
      success: false,
      error: 'Recording is already being transcribed or has already been processed',
    });

    const response = await POST(
      makeRequest({ recordingSessionId: 'already-processing' })
    );

    expect(response.status).toBe(409);
  });
});

// ============================================================================
// SEGMENTS API ROUTE TESTS
// ============================================================================

describe('GET /api/admin/recordings/[sessionId]/segments', () => {
  let GET: typeof import('../../../../app/api/admin/recordings/[sessionId]/segments/route').GET;

  beforeAll(async () => {
    const routeModule = await import(
      '../../../../app/api/admin/recordings/[sessionId]/segments/route'
    );
    GET = routeModule.GET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sessionId = 'session-abc';

  function makeRequest(): NextRequest {
    return new NextRequest(
      `http://localhost/api/admin/recordings/${sessionId}/segments`
    );
  }

  function makeParams() {
    return { params: Promise.resolve({ sessionId }) };
  }

  it('returns 401 without auth', async () => {
    mockGetAdminSession.mockResolvedValueOnce(false);

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when session not found', async () => {
    mockGetAdminSession.mockResolvedValueOnce(true);
    mockGetRecordingSession.mockResolvedValueOnce({
      success: false,
      error: 'Recording session not found',
    });

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Recording session not found');
  });

  it('returns segments array with correct shape', async () => {
    mockGetAdminSession.mockResolvedValueOnce(true);
    mockGetRecordingSession.mockResolvedValueOnce({
      success: true,
      data: {
        id: sessionId,
        segments: [
          {
            id: 'seg-1',
            segmentIndex: 0,
            speakerLabel: 'A',
            content: 'Hello',
            startMs: 0,
            endMs: 1500,
            language: 'ja',
            recordingId: sessionId,
            createdAt: new Date(),
          },
          {
            id: 'seg-2',
            segmentIndex: 1,
            speakerLabel: 'B',
            content: 'Hi there',
            startMs: 1500,
            endMs: 3000,
            language: 'ja',
            recordingId: sessionId,
            createdAt: new Date(),
          },
        ],
      },
    });

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.segments).toHaveLength(2);
    expect(body.segments[0]).toEqual({
      segmentIndex: 0,
      speakerLabel: 'A',
      content: 'Hello',
      startMs: 0,
      endMs: 1500,
    });
    expect(body.segments[1]).toEqual({
      segmentIndex: 1,
      speakerLabel: 'B',
      content: 'Hi there',
      startMs: 1500,
      endMs: 3000,
    });
  });
});
