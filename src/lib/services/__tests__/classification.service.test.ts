/**
 * Classification Service Unit Tests
 *
 * Tests classifyAndStoreEntries function: OpenAI structured output,
 * entry storage, summary update, and error handling.
 * Uses jest.fn() delegation pattern to avoid hoisting issues.
 */

// ============================================================================
// MOCKS — must be declared before imports due to jest.mock hoisting
// ============================================================================

const mockRecordFindUnique = jest.fn();
const mockRecordUpdate = jest.fn();
const mockEntryCreateMany = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@/lib/db/client', () => ({
  prisma: {
    karuteRecord: {
      findUnique: (...args: unknown[]) => mockRecordFindUnique(...args),
      update: (...args: unknown[]) => mockRecordUpdate(...args),
    },
    karuteEntry: {
      createMany: (...args: unknown[]) => mockEntryCreateMany(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

const mockChatCreate = jest.fn();
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: (...args: unknown[]) => mockChatCreate(...args),
        },
      },
    })),
  };
});

const mockCaptureException = jest.fn();
jest.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

import { classifyAndStoreEntries } from '../classification.service';

// ============================================================================
// TEST DATA
// ============================================================================

const MOCK_SEGMENTS = [
  {
    id: 'seg-1',
    recordingId: 'rec-1',
    segmentIndex: 0,
    speakerLabel: 'Speaker 1',
    content: '肩が痛いです',
    startMs: 0,
    endMs: 2000,
    language: 'ja',
    createdAt: new Date(),
  },
  {
    id: 'seg-2',
    recordingId: 'rec-1',
    segmentIndex: 1,
    speakerLabel: 'Speaker 2',
    content: '肩周りをほぐしていきますね',
    startMs: 2500,
    endMs: 5000,
    language: 'ja',
    createdAt: new Date(),
  },
];

const MOCK_RECORD = {
  id: 'karute-1',
  customerId: 'cust-1',
  workerId: 'worker-1',
  status: 'DRAFT',
  recordingSessions: [
    {
      id: 'rec-1',
      segments: MOCK_SEGMENTS,
    },
  ],
};

const MOCK_CLASSIFICATION_RESPONSE = {
  summary: '肩の痛みに対する施術セッション',
  entries: [
    {
      category: 'SYMPTOM',
      content: '肩の痛み',
      confidence: 0.95,
      originalQuote: '肩が痛いです',
      segmentIndices: [0],
    },
    {
      category: 'TREATMENT',
      content: '肩周りのほぐし',
      confidence: 0.9,
      originalQuote: '肩周りをほぐしていきますね',
      segmentIndices: [1],
    },
  ],
};

// ============================================================================
// TESTS
// ============================================================================

describe('classification.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';

    // Default: transaction executes the callback with mock tx
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        karuteRecord: {
          update: (...args: unknown[]) => mockRecordUpdate(...args),
        },
        karuteEntry: {
          createMany: (...args: unknown[]) => mockEntryCreateMany(...args),
        },
      };
      return fn(tx);
    });

    mockRecordUpdate.mockResolvedValue({});
    mockEntryCreateMany.mockResolvedValue({ count: 2 });
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('successful classification', () => {
    it('calls OpenAI with correct model and response_format, stores entries', async () => {
      mockRecordFindUnique.mockResolvedValue(MOCK_RECORD);
      mockChatCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(MOCK_CLASSIFICATION_RESPONSE),
            },
          },
        ],
      });

      const result = await classifyAndStoreEntries('karute-1');

      expect(result).toEqual({ success: true, entryCount: 2 });

      // Verify OpenAI called with gpt-4o and json_schema response_format
      expect(mockChatCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          response_format: expect.objectContaining({
            type: 'json_schema',
            json_schema: expect.objectContaining({
              name: 'karute_classification',
              strict: true,
            }),
          }),
        })
      );
    });

    it('stores entries in transaction with correct data mapping', async () => {
      mockRecordFindUnique.mockResolvedValue(MOCK_RECORD);
      mockChatCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(MOCK_CLASSIFICATION_RESPONSE),
            },
          },
        ],
      });

      await classifyAndStoreEntries('karute-1');

      // Verify transaction was called
      expect(mockTransaction).toHaveBeenCalled();

      // Verify summary was updated
      expect(mockRecordUpdate).toHaveBeenCalledWith({
        where: { id: 'karute-1' },
        data: { aiSummary: '肩の痛みに対する施術セッション' },
      });

      // Verify entries were created with displayOrder and segmentIndices
      expect(mockEntryCreateMany).toHaveBeenCalledWith({
        data: [
          {
            karuteId: 'karute-1',
            category: 'SYMPTOM',
            content: '肩の痛み',
            confidence: 0.95,
            originalQuote: '肩が痛いです',
            segmentIndices: [0],
            displayOrder: 0,
          },
          {
            karuteId: 'karute-1',
            category: 'TREATMENT',
            content: '肩周りのほぐし',
            confidence: 0.9,
            originalQuote: '肩周りをほぐしていきますね',
            segmentIndices: [1],
            displayOrder: 1,
          },
        ],
      });
    });
  });

  describe('no segments found', () => {
    it('returns error when record has no transcription segments', async () => {
      mockRecordFindUnique.mockResolvedValue({
        ...MOCK_RECORD,
        recordingSessions: [{ id: 'rec-1', segments: [] }],
      });

      const result = await classifyAndStoreEntries('karute-1');

      expect(result).toEqual({
        success: false,
        error: 'No transcription segments found',
      });
      expect(mockChatCreate).not.toHaveBeenCalled();
    });

    it('returns error when record not found', async () => {
      mockRecordFindUnique.mockResolvedValue(null);

      const result = await classifyAndStoreEntries('nonexistent');

      expect(result).toEqual({
        success: false,
        error: 'Karute record not found',
      });
      expect(mockChatCreate).not.toHaveBeenCalled();
    });
  });

  describe('OpenAI error handling', () => {
    it('returns error on OpenAI failure with Sentry capture', async () => {
      mockRecordFindUnique.mockResolvedValue(MOCK_RECORD);
      mockChatCreate.mockRejectedValue(new Error('OpenAI rate limit'));

      const result = await classifyAndStoreEntries('karute-1');

      expect(result).toEqual({
        success: false,
        error: 'OpenAI rate limit',
      });
      expect(mockCaptureException).toHaveBeenCalled();
    });

    it('returns error when response content is empty', async () => {
      mockRecordFindUnique.mockResolvedValue(MOCK_RECORD);
      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const result = await classifyAndStoreEntries('karute-1');

      expect(result).toEqual({
        success: false,
        error: 'Empty classification response',
      });
    });
  });
});
