/**
 * Recording Service Unit Tests
 *
 * Tests CRUD operations for RecordingSession entities.
 * Mocks Prisma client, storage module, and Sentry.
 */

// ============================================================================
// MOCKS — must be declared before imports due to jest.mock hoisting
// ============================================================================

const mockSessionCreate = jest.fn()
const mockSessionFindUnique = jest.fn()
const mockSessionUpdate = jest.fn()
const mockSessionDelete = jest.fn()

jest.mock('@/lib/db/client', () => ({
  prisma: {
    recordingSession: {
      create: (...args: unknown[]) => mockSessionCreate(...args),
      findUnique: (...args: unknown[]) => mockSessionFindUnique(...args),
      update: (...args: unknown[]) => mockSessionUpdate(...args),
      delete: (...args: unknown[]) => mockSessionDelete(...args),
    },
  },
}))

jest.mock('@/lib/db/rls-context', () => ({
  withRLSContext: async (_ctx: unknown, op: (tx: unknown) => Promise<unknown>) => {
    const { prisma } = require('@/lib/db/client')
    return op(prisma)
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
  createRecordingSession,
  getRecordingSession,
  updateRecordingSession,
  deleteRecordingSession,
} from '../recording.service'

// ============================================================================
// TEST IDS (valid UUIDs required by validation)
// ============================================================================

const IDS = {
  session1: '11111111-1111-4111-a111-111111111111',
  session2: '22222222-2222-4222-a222-222222222222',
  session3: '33333333-3333-4333-a333-333333333333',
  cust1: '44444444-4444-4444-a444-444444444444',
  worker1: '55555555-5555-4555-a555-555555555555',
  seg1: '66666666-6666-4666-a666-666666666666',
  seg2: '77777777-7777-4777-a777-777777777777',
}

// ============================================================================
// RECORDING SESSION TESTS
// ============================================================================

describe('recording.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createRecordingSession', () => {
    it('returns success with created session', async () => {
      const mockSession = {
        id: IDS.session1,
        customerId: IDS.cust1,
        workerId: IDS.worker1,
        customer: {},
        worker: {},
        karuteRecord: null,
      }
      mockSessionCreate.mockResolvedValue(mockSession)

      const result = await createRecordingSession({
        customerId: IDS.cust1,
        workerId: IDS.worker1,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(IDS.session1)
      }
      expect(mockSessionCreate).toHaveBeenCalledWith({
        data: {
          customerId: IDS.cust1,
          workerId: IDS.worker1,
        },
        include: expect.objectContaining({
          customer: true,
          worker: true,
          karuteRecord: true,
        }),
      })
    })

    it('returns error on validation failure', async () => {
      const result = await createRecordingSession({
        customerId: '',
        workerId: IDS.worker1,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Customer ID is required')
      }
      expect(mockSessionCreate).not.toHaveBeenCalled()
    })

    it('returns error and captures to Sentry when Prisma throws', async () => {
      const dbError = new Error('Connection timeout')
      mockSessionCreate.mockRejectedValue(dbError)

      const result = await createRecordingSession({
        customerId: IDS.cust1,
        workerId: IDS.worker1,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Connection timeout')
      }
      expect(mockSessionCreate).toHaveBeenCalled()
      expect(mockCaptureException).toHaveBeenCalledWith(dbError, expect.anything())
    })
  })

  describe('getRecordingSession', () => {
    it('returns success with session and ordered segments', async () => {
      const mockSession = {
        id: IDS.session1,
        segments: [
          { id: IDS.seg1, segmentIndex: 0 },
          { id: IDS.seg2, segmentIndex: 1 },
        ],
        customer: {},
        worker: {},
        karuteRecord: null,
      }
      mockSessionFindUnique.mockResolvedValue(mockSession)

      const result = await getRecordingSession(IDS.session1)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(IDS.session1)
        expect(result.data.segments).toHaveLength(2)
      }
      expect(mockSessionFindUnique).toHaveBeenCalledWith({
        where: { id: IDS.session1 },
        include: expect.objectContaining({
          segments: expect.objectContaining({ orderBy: { segmentIndex: 'asc' } }),
          customer: true,
          worker: true,
        }),
      })
    })

    it('returns error when not found', async () => {
      mockSessionFindUnique.mockResolvedValue(null)

      const result = await getRecordingSession('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Recording session not found')
      }
    })
  })

  describe('updateRecordingSession', () => {
    it('returns success with updated session', async () => {
      const mockSession = {
        id: IDS.session1,
        audioStoragePath: 'session-1.webm',
        customer: {},
        worker: {},
        karuteRecord: null,
      }
      mockSessionUpdate.mockResolvedValue(mockSession)

      const result = await updateRecordingSession({
        id: IDS.session1,
        audioStoragePath: 'session-1.webm',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(IDS.session1)
      }
      expect(mockSessionUpdate).toHaveBeenCalledWith({
        where: { id: IDS.session1 },
        data: expect.objectContaining({ audioStoragePath: 'session-1.webm' }),
        include: expect.objectContaining({ customer: true, worker: true }),
      })
    })

    it('returns error when validation fails (empty id)', async () => {
      const result = await updateRecordingSession({ id: '' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Session ID must be a valid UUID')
      }
      expect(mockSessionUpdate).not.toHaveBeenCalled()
    })
  })

  describe('deleteRecordingSession', () => {
    it('returns success and deletes audio from storage', async () => {
      const mockSession = {
        id: IDS.session1,
        audioStoragePath: 'session-1.webm',
      }
      mockSessionFindUnique.mockResolvedValue(mockSession)
      mockSessionDelete.mockResolvedValue(mockSession)
      mockDeleteRecording.mockResolvedValue(undefined)

      const result = await deleteRecordingSession(IDS.session1)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(IDS.session1)
      }
      expect(mockDeleteRecording).toHaveBeenCalledWith('session-1.webm')
      expect(mockSessionDelete).toHaveBeenCalledWith({
        where: { id: IDS.session1 },
      })
    })

    it('returns success when no audio file to clean up', async () => {
      const mockSession = {
        id: IDS.session2,
        audioStoragePath: null,
      }
      mockSessionFindUnique.mockResolvedValue(mockSession)
      mockSessionDelete.mockResolvedValue(mockSession)

      const result = await deleteRecordingSession(IDS.session2)

      expect(result.success).toBe(true)
      expect(mockDeleteRecording).not.toHaveBeenCalled()
    })

    it('still deletes session when audio cleanup fails (best-effort)', async () => {
      const mockSession = {
        id: IDS.session3,
        audioStoragePath: 'session-3.webm',
      }
      mockSessionFindUnique.mockResolvedValue(mockSession)
      mockSessionDelete.mockResolvedValue(mockSession)
      mockDeleteRecording.mockRejectedValue(new Error('storage down'))

      const result = await deleteRecordingSession(IDS.session3)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(IDS.session3)
      }
      expect(mockSessionDelete).toHaveBeenCalledWith({ where: { id: IDS.session3 } })
      expect(mockDeleteRecording).toHaveBeenCalledWith('session-3.webm')
    })
  })
})
