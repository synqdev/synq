/**
 * Karute Foundation Integration Tests
 *
 * Tests cross-service integration flows for Phase 3 (Karte Foundation):
 * - KaruteRecord + KaruteEntry lifecycle
 * - KaruteRecord status transitions (DRAFT -> REVIEW -> APPROVED)
 * - RecordingSession lifecycle
 * - Cascade deletion behaviour
 * - Cross-service interactions (karute + recording + entries)
 *
 * Mocks Prisma client, storage module, and Sentry (unit-style integration tests).
 */

// ============================================================================
// MOCKS — must be declared before imports due to jest.mock hoisting
// ============================================================================

const mockKaruteRecordCreate = jest.fn()
const mockKaruteRecordFindUnique = jest.fn()
const mockKaruteRecordFindMany = jest.fn()
const mockKaruteRecordUpdate = jest.fn()
const mockKaruteRecordDelete = jest.fn()
const mockKaruteEntryCreate = jest.fn()
const mockKaruteEntryFindUnique = jest.fn()
const mockKaruteEntryUpdate = jest.fn()
const mockKaruteEntryDelete = jest.fn()
const mockSessionCreate = jest.fn()
const mockSessionFindUnique = jest.fn()
const mockSessionUpdate = jest.fn()
const mockSessionDelete = jest.fn()
const mockExecuteRaw = jest.fn().mockResolvedValue(0)

jest.mock('@/lib/db/client', () => ({
  prisma: {
    $executeRaw: (...args: unknown[]) => mockExecuteRaw(...args),
    karuteRecord: {
      create: (...args: unknown[]) => mockKaruteRecordCreate(...args),
      findUnique: (...args: unknown[]) => mockKaruteRecordFindUnique(...args),
      findMany: (...args: unknown[]) => mockKaruteRecordFindMany(...args),
      update: (...args: unknown[]) => mockKaruteRecordUpdate(...args),
      delete: (...args: unknown[]) => mockKaruteRecordDelete(...args),
    },
    karuteEntry: {
      create: (...args: unknown[]) => mockKaruteEntryCreate(...args),
      findUnique: (...args: unknown[]) => mockKaruteEntryFindUnique(...args),
      update: (...args: unknown[]) => mockKaruteEntryUpdate(...args),
      delete: (...args: unknown[]) => mockKaruteEntryDelete(...args),
    },
    recordingSession: {
      create: (...args: unknown[]) => mockSessionCreate(...args),
      findUnique: (...args: unknown[]) => mockSessionFindUnique(...args),
      update: (...args: unknown[]) => mockSessionUpdate(...args),
      delete: (...args: unknown[]) => mockSessionDelete(...args),
    },
  },
}))

const mockDeleteRecording = jest.fn()
jest.mock('@/lib/storage/recording-storage', () => ({
  deleteRecording: (...args: unknown[]) => mockDeleteRecording(...args),
}))

const mockCaptureException = jest.fn()
jest.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}))

import {
  createKaruteRecord,
  getKaruteRecord,
  getKaruteRecordsByCustomer,
  updateKaruteRecord,
  deleteKaruteRecord,
  createKaruteEntry,
  updateKaruteEntry,
  deleteKaruteEntry,
} from '../karute.service'

import {
  createRecordingSession,
  getRecordingSession,
  updateRecordingSession,
  deleteRecordingSession,
} from '../recording.service'

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function makeKaruteRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'record-1',
    customerId: 'cust-1',
    workerId: 'worker-1',
    bookingId: null,
    aiSummary: null,
    status: 'DRAFT',
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
    entries: [],
    customer: { id: 'cust-1', name: 'Test Customer' },
    worker: { id: 'worker-1', name: 'Test Worker' },
    booking: null,
    recordingSessions: [],
    ...overrides,
  }
}

function makeKaruteEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entry-1',
    karuteId: 'record-1',
    category: 'SYMPTOM',
    content: 'Shoulder pain on the left side',
    originalQuote: 'My left shoulder really hurts',
    confidence: 0.85,
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
    ...overrides,
  }
}

function makeRecordingSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    karuteRecordId: 'record-1',
    workerId: 'worker-1',
    customerId: 'cust-1',
    bookingId: null,
    audioStoragePath: null,
    durationSeconds: null,
    status: 'RECORDING',
    startedAt: new Date('2026-03-01'),
    endedAt: null,
    createdAt: new Date('2026-03-01'),
    customer: { id: 'cust-1', name: 'Test Customer' },
    worker: { id: 'worker-1', name: 'Test Worker' },
    karuteRecord: null,
    segments: [],
    ...overrides,
  }
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Karute Foundation Integration Tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockExecuteRaw.mockResolvedValue(0)
  })

  // --------------------------------------------------------------------------
  // Flow 1: Create karute record with entries
  // --------------------------------------------------------------------------
  describe('create karute record with entries', () => {
    it('creates a record then adds multiple entries of different categories', async () => {
      const record = makeKaruteRecord()
      mockKaruteRecordCreate.mockResolvedValue(record)

      const createResult = await createKaruteRecord({
        customerId: 'cust-1',
        workerId: 'worker-1',
      })

      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const symptomEntry = makeKaruteEntry({
        id: 'entry-symptom',
        category: 'SYMPTOM',
        content: 'Shoulder pain',
      })
      const treatmentEntry = makeKaruteEntry({
        id: 'entry-treatment',
        category: 'TREATMENT',
        content: 'Deep tissue massage applied',
      })
      const bodyAreaEntry = makeKaruteEntry({
        id: 'entry-body',
        category: 'BODY_AREA',
        content: 'Left shoulder, trapezius',
      })

      mockKaruteEntryCreate
        .mockResolvedValueOnce(symptomEntry)
        .mockResolvedValueOnce(treatmentEntry)
        .mockResolvedValueOnce(bodyAreaEntry)

      const results = await Promise.all([
        createKaruteEntry({
          karuteId: createResult.data.id,
          category: 'SYMPTOM',
          content: 'Shoulder pain',
        }),
        createKaruteEntry({
          karuteId: createResult.data.id,
          category: 'TREATMENT',
          content: 'Deep tissue massage applied',
        }),
        createKaruteEntry({
          karuteId: createResult.data.id,
          category: 'BODY_AREA',
          content: 'Left shoulder, trapezius',
        }),
      ])

      expect(results.every((r) => r.success)).toBe(true)
      expect(mockKaruteEntryCreate).toHaveBeenCalledTimes(3)

      // Verify each entry was created with correct karuteId
      for (const call of mockKaruteEntryCreate.mock.calls) {
        expect(call[0].data.karuteId).toBe('record-1')
      }
    })

    it('creates a record with optional bookingId', async () => {
      const record = makeKaruteRecord({ bookingId: 'booking-1' })
      mockKaruteRecordCreate.mockResolvedValue(record)

      const result = await createKaruteRecord({
        customerId: 'cust-1',
        workerId: 'worker-1',
        bookingId: 'booking-1',
      })

      expect(result.success).toBe(true)
      expect(mockKaruteRecordCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ bookingId: 'booking-1' }),
        })
      )
    })

    it('fails to add entry with invalid category', async () => {
      const result = await createKaruteEntry({
        karuteId: 'record-1',
        category: 'INVALID_CATEGORY' as 'SYMPTOM',
        content: 'test content',
      })

      expect(result.success).toBe(false)
      expect(mockKaruteEntryCreate).not.toHaveBeenCalled()
    })

    it('fails to add entry with empty content', async () => {
      const result = await createKaruteEntry({
        karuteId: 'record-1',
        category: 'SYMPTOM',
        content: '',
      })

      expect(result.success).toBe(false)
      expect(mockKaruteEntryCreate).not.toHaveBeenCalled()
    })
  })

  // --------------------------------------------------------------------------
  // Flow 2: Status transitions (DRAFT -> REVIEW -> APPROVED)
  // --------------------------------------------------------------------------
  describe('karute record status transitions', () => {
    it('transitions from DRAFT to REVIEW', async () => {
      const updatedRecord = makeKaruteRecord({ status: 'REVIEW' })
      mockKaruteRecordUpdate.mockResolvedValue(updatedRecord)

      const result = await updateKaruteRecord({
        id: 'record-1',
        status: 'REVIEW',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('REVIEW')
      }
      expect(mockKaruteRecordUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'record-1' },
          data: { status: 'REVIEW' },
        })
      )
    })

    it('transitions from REVIEW to APPROVED', async () => {
      const updatedRecord = makeKaruteRecord({ status: 'APPROVED' })
      mockKaruteRecordUpdate.mockResolvedValue(updatedRecord)

      const result = await updateKaruteRecord({
        id: 'record-1',
        status: 'APPROVED',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('APPROVED')
      }
    })

    it('transitions DRAFT to APPROVED directly', async () => {
      const updatedRecord = makeKaruteRecord({ status: 'APPROVED' })
      mockKaruteRecordUpdate.mockResolvedValue(updatedRecord)

      const result = await updateKaruteRecord({
        id: 'record-1',
        status: 'APPROVED',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('APPROVED')
      }
    })

    it('rejects invalid status values via validation', async () => {
      const result = await updateKaruteRecord({
        id: 'record-1',
        status: 'INVALID_STATUS' as 'DRAFT',
      })

      expect(result.success).toBe(false)
      expect(mockKaruteRecordUpdate).not.toHaveBeenCalled()
    })

    it('updates aiSummary along with status', async () => {
      const updatedRecord = makeKaruteRecord({
        status: 'REVIEW',
        aiSummary: 'Patient reports shoulder pain. Deep tissue applied.',
      })
      mockKaruteRecordUpdate.mockResolvedValue(updatedRecord)

      const result = await updateKaruteRecord({
        id: 'record-1',
        status: 'REVIEW',
        aiSummary: 'Patient reports shoulder pain. Deep tissue applied.',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.aiSummary).toBe('Patient reports shoulder pain. Deep tissue applied.')
        expect(result.data.status).toBe('REVIEW')
      }
      expect(mockKaruteRecordUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: 'REVIEW',
            aiSummary: 'Patient reports shoulder pain. Deep tissue applied.',
          },
        })
      )
    })
  })

  // --------------------------------------------------------------------------
  // Flow 3: Recording session lifecycle
  // --------------------------------------------------------------------------
  describe('recording session lifecycle', () => {
    it('creates a session, updates status through lifecycle, then completes', async () => {
      // Step 1: Create session
      const session = makeRecordingSession()
      mockSessionCreate.mockResolvedValue(session)

      const createResult = await createRecordingSession({
        customerId: 'cust-1',
        workerId: 'worker-1',
        karuteRecordId: 'record-1',
      })

      expect(createResult.success).toBe(true)

      // Step 2: Pause recording
      const pausedSession = makeRecordingSession({ status: 'PAUSED' })
      mockSessionUpdate.mockResolvedValue(pausedSession)

      const pauseResult = await updateRecordingSession({
        id: 'session-1',
        status: 'PAUSED',
      })

      expect(pauseResult.success).toBe(true)

      // Step 3: Resume recording
      const resumedSession = makeRecordingSession({ status: 'RECORDING' })
      mockSessionUpdate.mockResolvedValue(resumedSession)

      const resumeResult = await updateRecordingSession({
        id: 'session-1',
        status: 'RECORDING',
      })

      expect(resumeResult.success).toBe(true)

      // Step 4: Complete recording
      const completedSession = makeRecordingSession({
        status: 'COMPLETED',
        endedAt: new Date('2026-03-01T01:00:00Z'),
        durationSeconds: 3600,
        audioStoragePath: 'recordings/session-1.webm',
      })
      mockSessionUpdate.mockResolvedValue(completedSession)

      const completeResult = await updateRecordingSession({
        id: 'session-1',
        status: 'COMPLETED',
        endedAt: new Date('2026-03-01T01:00:00Z'),
        durationSeconds: 3600,
        audioStoragePath: 'recordings/session-1.webm',
      })

      expect(completeResult.success).toBe(true)
      if (completeResult.success) {
        expect(completeResult.data.status).toBe('COMPLETED')
        expect(completeResult.data.durationSeconds).toBe(3600)
        expect(completeResult.data.audioStoragePath).toBe('recordings/session-1.webm')
      }

      expect(mockSessionUpdate).toHaveBeenCalledTimes(3)
    })

    it('creates a session linked to a karute record', async () => {
      const session = makeRecordingSession({ karuteRecordId: 'record-1' })
      mockSessionCreate.mockResolvedValue(session)

      const result = await createRecordingSession({
        customerId: 'cust-1',
        workerId: 'worker-1',
        karuteRecordId: 'record-1',
      })

      expect(result.success).toBe(true)
      expect(mockSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ karuteRecordId: 'record-1' }),
        })
      )
    })

    it('creates a standalone session without karute record', async () => {
      const session = makeRecordingSession({ karuteRecordId: null })
      mockSessionCreate.mockResolvedValue(session)

      const result = await createRecordingSession({
        customerId: 'cust-1',
        workerId: 'worker-1',
      })

      expect(result.success).toBe(true)
      const callData = mockSessionCreate.mock.calls[0][0].data
      expect(callData).not.toHaveProperty('karuteRecordId')
    })

    it('retrieves session with transcription segments', async () => {
      const session = makeRecordingSession({
        segments: [
          { id: 'seg-1', segmentIndex: 0, content: 'Hello', startMs: 0, endMs: 1000 },
          { id: 'seg-2', segmentIndex: 1, content: 'How are you', startMs: 1000, endMs: 2500 },
        ],
      })
      mockSessionFindUnique.mockResolvedValue(session)

      const result = await getRecordingSession('session-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.segments).toHaveLength(2)
      }
    })

    it('rejects invalid recording status via validation', async () => {
      const result = await updateRecordingSession({
        id: 'session-1',
        status: 'INVALID' as 'RECORDING',
      })

      expect(result.success).toBe(false)
      expect(mockSessionUpdate).not.toHaveBeenCalled()
    })
  })

  // --------------------------------------------------------------------------
  // Flow 4: CRUD operations on karute entries
  // --------------------------------------------------------------------------
  describe('karute entry CRUD', () => {
    it('creates an entry with all optional fields', async () => {
      const entry = makeKaruteEntry({
        originalQuote: 'My shoulder has been hurting for days',
        confidence: 0.92,
      })
      mockKaruteEntryCreate.mockResolvedValue(entry)

      const result = await createKaruteEntry({
        karuteId: 'record-1',
        category: 'SYMPTOM',
        content: 'Shoulder pain on the left side',
        originalQuote: 'My shoulder has been hurting for days',
        confidence: 0.92,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.originalQuote).toBe('My shoulder has been hurting for days')
        expect(result.data.confidence).toBe(0.92)
      }
    })

    it('creates an entry with default confidence when not provided', async () => {
      const entry = makeKaruteEntry({ confidence: 0 })
      mockKaruteEntryCreate.mockResolvedValue(entry)

      const result = await createKaruteEntry({
        karuteId: 'record-1',
        category: 'OTHER',
        content: 'General note',
      })

      expect(result.success).toBe(true)
      // confidence defaults to 0 via schema
      expect(mockKaruteEntryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ confidence: 0 }),
        })
      )
    })

    it('updates entry category and content', async () => {
      const updatedEntry = makeKaruteEntry({
        category: 'TREATMENT',
        content: 'Updated treatment info',
      })
      mockKaruteEntryUpdate.mockResolvedValue(updatedEntry)

      const result = await updateKaruteEntry({
        id: 'entry-1',
        category: 'TREATMENT',
        content: 'Updated treatment info',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.category).toBe('TREATMENT')
        expect(result.data.content).toBe('Updated treatment info')
      }
      expect(mockKaruteEntryUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'entry-1' },
          data: expect.objectContaining({
            category: 'TREATMENT',
            content: 'Updated treatment info',
          }),
        })
      )
    })

    it('updates entry confidence score', async () => {
      const updatedEntry = makeKaruteEntry({ confidence: 0.95 })
      mockKaruteEntryUpdate.mockResolvedValue(updatedEntry)

      const result = await updateKaruteEntry({
        id: 'entry-1',
        confidence: 0.95,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.confidence).toBe(0.95)
      }
    })

    it('rejects confidence outside 0-1 range', async () => {
      const result = await createKaruteEntry({
        karuteId: 'record-1',
        category: 'SYMPTOM',
        content: 'test',
        confidence: 1.5,
      })

      expect(result.success).toBe(false)
      expect(mockKaruteEntryCreate).not.toHaveBeenCalled()
    })

    it('rejects negative confidence', async () => {
      const result = await createKaruteEntry({
        karuteId: 'record-1',
        category: 'SYMPTOM',
        content: 'test',
        confidence: -0.1,
      })

      expect(result.success).toBe(false)
      expect(mockKaruteEntryCreate).not.toHaveBeenCalled()
    })

    it('deletes an entry that exists', async () => {
      mockKaruteEntryFindUnique.mockResolvedValue(makeKaruteEntry())
      mockKaruteEntryDelete.mockResolvedValue({ id: 'entry-1' })

      const result = await deleteKaruteEntry('entry-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('entry-1')
      }
      expect(mockKaruteEntryDelete).toHaveBeenCalledWith({ where: { id: 'entry-1' } })
    })

    it('returns error when deleting non-existent entry', async () => {
      mockKaruteEntryFindUnique.mockResolvedValue(null)

      const result = await deleteKaruteEntry('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Karute entry not found')
      }
      expect(mockKaruteEntryDelete).not.toHaveBeenCalled()
    })

    it('creates entries for all valid categories', async () => {
      const categories = [
        'SYMPTOM',
        'TREATMENT',
        'BODY_AREA',
        'PREFERENCE',
        'LIFESTYLE',
        'NEXT_VISIT',
        'OTHER',
      ] as const

      for (const category of categories) {
        mockKaruteEntryCreate.mockResolvedValue(
          makeKaruteEntry({ id: `entry-${category}`, category })
        )

        const result = await createKaruteEntry({
          karuteId: 'record-1',
          category,
          content: `Content for ${category}`,
        })

        expect(result.success).toBe(true)
      }

      expect(mockKaruteEntryCreate).toHaveBeenCalledTimes(categories.length)
    })
  })

  // --------------------------------------------------------------------------
  // Flow 5: Cascade deletion
  // --------------------------------------------------------------------------
  describe('cascade deletion', () => {
    it('deletes karute record and cleans up multiple audio files', async () => {
      const record = makeKaruteRecord({
        recordingSessions: [
          { id: 'session-1', audioStoragePath: 'recordings/session-1.webm' },
          { id: 'session-2', audioStoragePath: 'recordings/session-2.webm' },
          { id: 'session-3', audioStoragePath: null },
        ],
      })
      mockKaruteRecordFindUnique.mockResolvedValue(record)
      mockKaruteRecordDelete.mockResolvedValue(record)
      mockDeleteRecording.mockResolvedValue(undefined)

      const result = await deleteKaruteRecord('record-1')

      expect(result.success).toBe(true)
      // Should only attempt to delete sessions with audio paths
      expect(mockDeleteRecording).toHaveBeenCalledTimes(2)
      expect(mockDeleteRecording).toHaveBeenCalledWith('recordings/session-1.webm')
      expect(mockDeleteRecording).toHaveBeenCalledWith('recordings/session-2.webm')
      expect(mockKaruteRecordDelete).toHaveBeenCalledWith({ where: { id: 'record-1' } })
    })

    it('deletes karute record with no recording sessions', async () => {
      const record = makeKaruteRecord({ recordingSessions: [] })
      mockKaruteRecordFindUnique.mockResolvedValue(record)
      mockKaruteRecordDelete.mockResolvedValue(record)

      const result = await deleteKaruteRecord('record-1')

      expect(result.success).toBe(true)
      expect(mockDeleteRecording).not.toHaveBeenCalled()
    })

    it('returns error when deleting non-existent karute record', async () => {
      mockKaruteRecordFindUnique.mockResolvedValue(null)

      const result = await deleteKaruteRecord('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Karute record not found')
      }
      expect(mockKaruteRecordDelete).not.toHaveBeenCalled()
    })

    it('still deletes record when some audio cleanup fails (best-effort)', async () => {
      const record = makeKaruteRecord({
        recordingSessions: [
          { id: 'session-1', audioStoragePath: 'recordings/session-1.webm' },
          { id: 'session-2', audioStoragePath: 'recordings/session-2.webm' },
        ],
      })
      mockKaruteRecordFindUnique.mockResolvedValue(record)
      mockKaruteRecordDelete.mockResolvedValue(record)
      mockDeleteRecording
        .mockRejectedValueOnce(new Error('Storage error'))
        .mockResolvedValueOnce(undefined)

      const result = await deleteKaruteRecord('record-1')

      expect(result.success).toBe(true)
      expect(mockDeleteRecording).toHaveBeenCalledTimes(2)
    })

    it('deletes recording session and cleans up audio', async () => {
      const session = makeRecordingSession({
        audioStoragePath: 'recordings/session-1.webm',
      })
      mockSessionFindUnique.mockResolvedValue(session)
      mockSessionDelete.mockResolvedValue(session)
      mockDeleteRecording.mockResolvedValue(undefined)

      const result = await deleteRecordingSession('session-1')

      expect(result.success).toBe(true)
      expect(mockDeleteRecording).toHaveBeenCalledWith('recordings/session-1.webm')
      expect(mockSessionDelete).toHaveBeenCalledWith({ where: { id: 'session-1' } })
    })

    it('deletes recording session without audio (no cleanup needed)', async () => {
      const session = makeRecordingSession({ audioStoragePath: null })
      mockSessionFindUnique.mockResolvedValue(session)
      mockSessionDelete.mockResolvedValue(session)

      const result = await deleteRecordingSession('session-1')

      expect(result.success).toBe(true)
      expect(mockDeleteRecording).not.toHaveBeenCalled()
    })
  })

  // --------------------------------------------------------------------------
  // Flow 6: Cross-service retrieval
  // --------------------------------------------------------------------------
  describe('cross-service retrieval', () => {
    it('retrieves karute record with entries and recording sessions', async () => {
      const record = makeKaruteRecord({
        entries: [
          makeKaruteEntry({ id: 'entry-1', category: 'SYMPTOM' }),
          makeKaruteEntry({ id: 'entry-2', category: 'TREATMENT' }),
        ],
        recordingSessions: [
          makeRecordingSession({ id: 'session-1' }),
        ],
      })
      mockKaruteRecordFindUnique.mockResolvedValue(record)

      const result = await getKaruteRecord('record-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.entries).toHaveLength(2)
        expect(result.data.recordingSessions).toHaveLength(1)
        expect(result.data.customer).toBeDefined()
        expect(result.data.worker).toBeDefined()
      }
    })

    it('lists karute records by customer ordered by creation date', async () => {
      const records = [
        makeKaruteRecord({ id: 'record-2', createdAt: new Date('2026-03-02') }),
        makeKaruteRecord({ id: 'record-1', createdAt: new Date('2026-03-01') }),
      ]
      mockKaruteRecordFindMany.mockResolvedValue(records)

      const result = await getKaruteRecordsByCustomer('cust-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
      }
      expect(mockKaruteRecordFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { customerId: 'cust-1' },
          orderBy: { createdAt: 'desc' },
        })
      )
    })

    it('returns empty list when customer has no karute records', async () => {
      mockKaruteRecordFindMany.mockResolvedValue([])

      const result = await getKaruteRecordsByCustomer('cust-no-records')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0)
      }
    })

    it('returns error when karute record not found', async () => {
      mockKaruteRecordFindUnique.mockResolvedValue(null)

      const result = await getKaruteRecord('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Karute record not found')
      }
    })

    it('returns error when recording session not found', async () => {
      mockSessionFindUnique.mockResolvedValue(null)

      const result = await getRecordingSession('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Recording session not found')
      }
    })
  })

  // --------------------------------------------------------------------------
  // Flow 7: Error handling and Sentry reporting
  // --------------------------------------------------------------------------
  describe('error handling across services', () => {
    it('reports karute record creation errors to Sentry', async () => {
      mockKaruteRecordCreate.mockRejectedValue(new Error('FK constraint violation'))

      const result = await createKaruteRecord({
        customerId: 'cust-1',
        workerId: 'worker-1',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FK constraint violation')
      }
      expect(mockCaptureException).toHaveBeenCalled()
    })

    it('reports recording session errors to Sentry', async () => {
      mockSessionCreate.mockRejectedValue(new Error('Connection timeout'))

      const result = await createRecordingSession({
        customerId: 'cust-1',
        workerId: 'worker-1',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Connection timeout')
      }
      expect(mockCaptureException).toHaveBeenCalled()
    })

    it('reports entry update errors to Sentry', async () => {
      mockKaruteEntryUpdate.mockRejectedValue(new Error('Record not found'))

      const result = await updateKaruteEntry({
        id: 'entry-1',
        content: 'Updated content',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Record not found')
      }
      expect(mockCaptureException).toHaveBeenCalled()
    })

    it('handles non-Error objects gracefully', async () => {
      mockKaruteRecordCreate.mockRejectedValue('string error')

      const result = await createKaruteRecord({
        customerId: 'cust-1',
        workerId: 'worker-1',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Unknown error')
      }
    })
  })
})
