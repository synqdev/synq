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
  deleteRecordingSession,
} from '../recording.service'

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
        id: 'session-1',
        customerId: 'cust-1',
        workerId: 'worker-1',
        customer: {},
        worker: {},
        karuteRecord: null,
      }
      mockSessionCreate.mockResolvedValue(mockSession)

      const result = await createRecordingSession({
        customerId: 'cust-1',
        workerId: 'worker-1',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('session-1')
      }
      expect(mockSessionCreate).toHaveBeenCalledWith({
        data: {
          customerId: 'cust-1',
          workerId: 'worker-1',
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
        workerId: 'worker-1',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Customer ID is required')
      }
      expect(mockSessionCreate).not.toHaveBeenCalled()
    })
  })

  describe('getRecordingSession', () => {
    it('returns success with session and ordered segments', async () => {
      const mockSession = {
        id: 'session-1',
        segments: [
          { id: 'seg-1', segmentIndex: 0 },
          { id: 'seg-2', segmentIndex: 1 },
        ],
        customer: {},
        worker: {},
        karuteRecord: null,
      }
      mockSessionFindUnique.mockResolvedValue(mockSession)

      const result = await getRecordingSession('session-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('session-1')
        expect(result.data.segments).toHaveLength(2)
      }
      expect(mockSessionFindUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
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

  describe('deleteRecordingSession', () => {
    it('returns success and deletes audio from storage', async () => {
      const mockSession = {
        id: 'session-1',
        audioStoragePath: 'session-1.webm',
      }
      mockSessionFindUnique.mockResolvedValue(mockSession)
      mockSessionDelete.mockResolvedValue(mockSession)
      mockDeleteRecording.mockResolvedValue(undefined)

      const result = await deleteRecordingSession('session-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('session-1')
      }
      expect(mockDeleteRecording).toHaveBeenCalledWith('session-1.webm')
      expect(mockSessionDelete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      })
    })

    it('returns success when no audio file to clean up', async () => {
      const mockSession = {
        id: 'session-2',
        audioStoragePath: null,
      }
      mockSessionFindUnique.mockResolvedValue(mockSession)
      mockSessionDelete.mockResolvedValue(mockSession)

      const result = await deleteRecordingSession('session-2')

      expect(result.success).toBe(true)
      expect(mockDeleteRecording).not.toHaveBeenCalled()
    })

    it('still deletes session when audio cleanup fails (best-effort)', async () => {
      const mockSession = {
        id: 'session-3',
        audioStoragePath: 'session-3.webm',
      }
      mockSessionFindUnique.mockResolvedValue(mockSession)
      mockSessionDelete.mockResolvedValue(mockSession)
      mockDeleteRecording.mockRejectedValue(new Error('storage down'))

      const result = await deleteRecordingSession('session-3')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('session-3')
      }
      expect(mockSessionDelete).toHaveBeenCalledWith({ where: { id: 'session-3' } })
      expect(mockDeleteRecording).toHaveBeenCalledWith('session-3.webm')
    })
  })
})
