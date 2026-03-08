/**
 * Karute Service Unit Tests
 *
 * Tests CRUD operations for KaruteRecord and KaruteEntry entities.
 * Mocks Prisma client, storage module, and Sentry.
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

jest.mock('@/lib/db/client', () => ({
  prisma: {
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

// ============================================================================
// KARUTE RECORD TESTS
// ============================================================================

describe('karute.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createKaruteRecord', () => {
    it('returns success with created record when input is valid', async () => {
      const mockRecord = {
        id: 'record-1',
        customerId: 'cust-1',
        workerId: 'worker-1',
        entries: [],
        customer: {},
        worker: {},
        booking: null,
        recordingSessions: [],
      }
      mockKaruteRecordCreate.mockResolvedValue(mockRecord)

      const result = await createKaruteRecord({
        customerId: 'cust-1',
        workerId: 'worker-1',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('record-1')
      }
      expect(mockKaruteRecordCreate).toHaveBeenCalledWith({
        data: {
          customerId: 'cust-1',
          workerId: 'worker-1',
        },
        include: expect.objectContaining({
          entries: true,
          customer: true,
          worker: true,
        }),
      })
    })

    it('returns error when validation fails (missing customerId)', async () => {
      const result = await createKaruteRecord({
        customerId: '',
        workerId: 'worker-1',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Customer ID is required')
      }
      expect(mockKaruteRecordCreate).not.toHaveBeenCalled()
    })

    it('returns error and calls Sentry when Prisma throws', async () => {
      mockKaruteRecordCreate.mockRejectedValue(new Error('DB connection failed'))

      const result = await createKaruteRecord({
        customerId: 'cust-1',
        workerId: 'worker-1',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB connection failed')
      }
      expect(mockCaptureException).toHaveBeenCalled()
    })
  })

  describe('getKaruteRecord', () => {
    it('returns success with record when found', async () => {
      const mockRecord = { id: 'record-1', entries: [], customer: {}, worker: {} }
      mockKaruteRecordFindUnique.mockResolvedValue(mockRecord)

      const result = await getKaruteRecord('record-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('record-1')
      }
    })

    it('returns error when record not found', async () => {
      mockKaruteRecordFindUnique.mockResolvedValue(null)

      const result = await getKaruteRecord('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Karute record not found')
      }
    })
  })

  describe('getKaruteRecordsByCustomer', () => {
    it('returns success with array of records', async () => {
      const mockRecords = [
        { id: 'record-1', entries: [], worker: {}, booking: null },
        { id: 'record-2', entries: [], worker: {}, booking: null },
      ]
      mockKaruteRecordFindMany.mockResolvedValue(mockRecords)

      const result = await getKaruteRecordsByCustomer('cust-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
      }
      expect(mockKaruteRecordFindMany).toHaveBeenCalledWith({
        where: { customerId: 'cust-1' },
        orderBy: { createdAt: 'desc' },
        include: expect.objectContaining({ entries: true, worker: true }),
      })
    })
  })

  describe('updateKaruteRecord', () => {
    it('returns success with updated record', async () => {
      const mockRecord = { id: 'record-1', status: 'APPROVED', entries: [], customer: {}, worker: {} }
      mockKaruteRecordUpdate.mockResolvedValue(mockRecord)

      const result = await updateKaruteRecord({
        id: 'record-1',
        status: 'APPROVED',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('record-1')
      }
    })

    it('returns error when validation fails', async () => {
      const result = await updateKaruteRecord({
        id: '',
      })

      expect(result.success).toBe(false)
      expect(mockKaruteRecordUpdate).not.toHaveBeenCalled()
    })
  })

  describe('deleteKaruteRecord', () => {
    it('returns success and cleans up storage files', async () => {
      const mockRecord = {
        id: 'record-1',
        recordingSessions: [
          { id: 'session-1', audioStoragePath: 'session-1.webm' },
        ],
      }
      mockKaruteRecordFindUnique.mockResolvedValue(mockRecord)
      mockKaruteRecordDelete.mockResolvedValue(mockRecord)
      mockDeleteRecording.mockResolvedValue(undefined)

      const result = await deleteKaruteRecord('record-1')

      expect(result.success).toBe(true)
      expect(mockDeleteRecording).toHaveBeenCalledWith('session-1.webm')
      expect(mockKaruteRecordDelete).toHaveBeenCalledWith({
        where: { id: 'record-1' },
      })
    })

    it('returns success even when storage cleanup fails (best-effort)', async () => {
      const mockRecord = {
        id: 'record-1',
        recordingSessions: [
          { id: 'session-1', audioStoragePath: 'session-1.webm' },
        ],
      }
      mockKaruteRecordFindUnique.mockResolvedValue(mockRecord)
      mockKaruteRecordDelete.mockResolvedValue(mockRecord)
      mockDeleteRecording.mockRejectedValue(new Error('Storage unavailable'))

      const result = await deleteKaruteRecord('record-1')

      expect(result.success).toBe(true)
      expect(mockKaruteRecordDelete).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // KARUTE ENTRY TESTS
  // ============================================================================

  describe('createKaruteEntry', () => {
    it('returns success with created entry', async () => {
      const mockEntry = {
        id: 'entry-1',
        karuteId: 'record-1',
        category: 'SYMPTOM',
        content: 'Shoulder pain',
      }
      mockKaruteEntryCreate.mockResolvedValue(mockEntry)

      const result = await createKaruteEntry({
        karuteId: 'record-1',
        category: 'SYMPTOM',
        content: 'Shoulder pain',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('entry-1')
      }
    })

    it('returns error on invalid category', async () => {
      const result = await createKaruteEntry({
        karuteId: 'record-1',
        category: 'INVALID' as 'SYMPTOM',
        content: 'test',
      })

      expect(result.success).toBe(false)
      expect(mockKaruteEntryCreate).not.toHaveBeenCalled()
    })
  })

  describe('updateKaruteEntry', () => {
    it('returns success with updated entry', async () => {
      const mockEntry = {
        id: 'entry-1',
        karuteId: 'record-1',
        category: 'TREATMENT',
        content: 'Updated content',
        confidence: 0.9,
      }
      mockKaruteEntryUpdate.mockResolvedValue(mockEntry)

      const result = await updateKaruteEntry({
        id: 'entry-1',
        content: 'Updated content',
        confidence: 0.9,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('entry-1')
        expect(result.data.content).toBe('Updated content')
      }
      expect(mockKaruteEntryUpdate).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: expect.objectContaining({ content: 'Updated content', confidence: 0.9 }),
      })
    })

    it('returns error when validation fails (empty id)', async () => {
      const result = await updateKaruteEntry({ id: '' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Entry ID is required')
      }
      expect(mockKaruteEntryUpdate).not.toHaveBeenCalled()
    })

    it('returns error and calls Sentry when Prisma throws', async () => {
      mockKaruteEntryUpdate.mockRejectedValue(new Error('DB error'))

      const result = await updateKaruteEntry({ id: 'entry-1', content: 'new content' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB error')
      }
      expect(mockCaptureException).toHaveBeenCalled()
    })
  })

  describe('deleteKaruteEntry', () => {
    it('returns success with deleted entry ID', async () => {
      const mockEntry = { id: 'entry-1', karuteId: 'record-1', category: 'SYMPTOM', content: 'test' }
      mockKaruteEntryFindUnique.mockResolvedValue(mockEntry)
      mockKaruteEntryDelete.mockResolvedValue({ id: 'entry-1' })

      const result = await deleteKaruteEntry('entry-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('entry-1')
      }
    })

    it('returns error when entry not found', async () => {
      mockKaruteEntryFindUnique.mockResolvedValue(null)

      const result = await deleteKaruteEntry('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Karute entry not found')
      }
      expect(mockKaruteEntryDelete).not.toHaveBeenCalled()
    })
  })
})
