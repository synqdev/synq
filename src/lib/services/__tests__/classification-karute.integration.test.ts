/**
 * @jest-environment node
 */

/**
 * Classification & Karute UI Integration Tests (Phase 5)
 *
 * Tests the interaction between classification service, karute API routes,
 * export service, and shared constants. All external dependencies (Prisma,
 * OpenAI, auth) are mocked — no real database or API calls.
 *
 * Uses jest.fn() delegation pattern consistent with existing test files.
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
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args: unknown[]) => mockChatCreate(...args),
      },
    },
  })),
}));

const mockCaptureException = jest.fn();
jest.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

jest.mock('@/lib/auth/admin', () => ({
  getAdminSession: jest.fn(),
}));

jest.mock('@/lib/services/karute-export.service', () => ({
  generateKaruteText: jest.fn(),
  generateKarutePDF: jest.fn(),
}));

jest.mock('@/lib/services/classification.service', () => ({
  ...jest.requireActual('@/lib/services/classification.service'),
  classifyAndStoreEntries: jest.fn(),
}));

// ============================================================================
// IMPORTS
// ============================================================================

import { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { classifyAndStoreEntries } from '@/lib/services/classification.service';
import {
  generateKaruteText,
  generateKarutePDF,
} from '@/lib/services/karute-export.service';
import {
  CATEGORY_KEYS,
  categoryColors,
} from '@/components/karute/constants';

// Import API route handlers
import { POST as classifyPOST } from '@/app/api/admin/karute/[id]/classify/route';
import { GET as exportGET } from '@/app/api/admin/karute/[id]/export/route';
import { GET as karuteGET } from '@/app/api/admin/karute/[id]/route';

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

const MOCK_FULL_RECORD = {
  id: 'karute-1',
  customerId: 'cust-1',
  workerId: 'worker-1',
  status: 'DRAFT',
  aiSummary: '肩の痛みに対する施術セッション',
  createdAt: new Date('2026-03-01T10:00:00Z'),
  entries: [
    {
      id: 'entry-1',
      karuteId: 'karute-1',
      category: 'SYMPTOM',
      content: '肩の痛み',
      confidence: 0.95,
      originalQuote: '肩が痛いです',
      segmentIndices: [0],
      displayOrder: 0,
      createdAt: new Date('2026-03-01T10:01:00Z'),
    },
    {
      id: 'entry-2',
      karuteId: 'karute-1',
      category: 'TREATMENT',
      content: '肩周りのほぐし',
      confidence: 0.9,
      originalQuote: '肩周りをほぐしていきますね',
      segmentIndices: [1],
      displayOrder: 1,
      createdAt: new Date('2026-03-01T10:01:01Z'),
    },
  ],
  customer: { id: 'cust-1', name: '田中太郎' },
  worker: { id: 'worker-1', name: '鈴木花子' },
  booking: { id: 'booking-1', startsAt: new Date('2026-03-01T10:00:00Z') },
  recordingSessions: [
    {
      id: 'rec-1',
      segments: MOCK_SEGMENTS,
    },
  ],
};

// ============================================================================
// HELPERS
// ============================================================================

/** Creates the params object matching Next.js App Router signature. */
function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

// ============================================================================
// TESTS: classifyAndStoreEntries — real service with mocked deps
// ============================================================================

describe('classifyAndStoreEntries (real service, mocked deps)', () => {
  let realClassifyAndStoreEntries: typeof import('@/lib/services/classification.service').classifyAndStoreEntries;

  beforeAll(async () => {
    // Unmock the classification service to test the real implementation
    jest.unmock('@/lib/services/classification.service');
    const mod = await import('@/lib/services/classification.service');
    realClassifyAndStoreEntries = mod.classifyAndStoreEntries;
  });

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

  it('returns structured entries with correct categories', async () => {
    mockRecordFindUnique.mockResolvedValue({
      id: 'karute-1',
      recordingSessions: [{ id: 'rec-1', segments: MOCK_SEGMENTS }],
    });
    mockChatCreate.mockResolvedValue({
      choices: [
        { message: { content: JSON.stringify(MOCK_CLASSIFICATION_RESPONSE) } },
      ],
    });

    const result = await realClassifyAndStoreEntries('karute-1');

    expect(result).toEqual({ success: true, entryCount: 2 });
  });

  it('handles empty transcript gracefully', async () => {
    mockRecordFindUnique.mockResolvedValue({
      id: 'karute-1',
      recordingSessions: [{ id: 'rec-1', segments: [] }],
    });

    const result = await realClassifyAndStoreEntries('karute-1');

    expect(result).toEqual({
      success: false,
      error: 'No transcription segments found',
    });
    expect(mockChatCreate).not.toHaveBeenCalled();
  });

  it('includes confidence scores and segment indices in stored entries', async () => {
    mockRecordFindUnique.mockResolvedValue({
      id: 'karute-1',
      recordingSessions: [{ id: 'rec-1', segments: MOCK_SEGMENTS }],
    });
    mockChatCreate.mockResolvedValue({
      choices: [
        { message: { content: JSON.stringify(MOCK_CLASSIFICATION_RESPONSE) } },
      ],
    });

    await realClassifyAndStoreEntries('karute-1');

    expect(mockEntryCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          confidence: 0.95,
          segmentIndices: [0],
          category: 'SYMPTOM',
        }),
        expect.objectContaining({
          confidence: 0.9,
          segmentIndices: [1],
          category: 'TREATMENT',
        }),
      ]),
    });
  });

  it('generates and stores AI summary', async () => {
    mockRecordFindUnique.mockResolvedValue({
      id: 'karute-1',
      recordingSessions: [{ id: 'rec-1', segments: MOCK_SEGMENTS }],
    });
    mockChatCreate.mockResolvedValue({
      choices: [
        { message: { content: JSON.stringify(MOCK_CLASSIFICATION_RESPONSE) } },
      ],
    });

    await realClassifyAndStoreEntries('karute-1');

    expect(mockRecordUpdate).toHaveBeenCalledWith({
      where: { id: 'karute-1' },
      data: { aiSummary: '肩の痛みに対する施術セッション' },
    });
  });

  it('handles OpenAI API errors gracefully with Sentry capture', async () => {
    mockRecordFindUnique.mockResolvedValue({
      id: 'karute-1',
      recordingSessions: [{ id: 'rec-1', segments: MOCK_SEGMENTS }],
    });
    mockChatCreate.mockRejectedValue(new Error('OpenAI rate limit'));

    const result = await realClassifyAndStoreEntries('karute-1');

    expect(result).toEqual({
      success: false,
      error: 'OpenAI rate limit',
    });
    expect(mockCaptureException).toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('saves entries to database with correct fields including displayOrder', async () => {
    mockRecordFindUnique.mockResolvedValue({
      id: 'karute-1',
      recordingSessions: [{ id: 'rec-1', segments: MOCK_SEGMENTS }],
    });
    mockChatCreate.mockResolvedValue({
      choices: [
        { message: { content: JSON.stringify(MOCK_CLASSIFICATION_RESPONSE) } },
      ],
    });

    await realClassifyAndStoreEntries('karute-1');

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

  it('returns error when record not found', async () => {
    mockRecordFindUnique.mockResolvedValue(null);

    const result = await realClassifyAndStoreEntries('nonexistent');

    expect(result).toEqual({
      success: false,
      error: 'Karute record not found',
    });
  });
});

// ============================================================================
// TESTS: POST /api/admin/karute/[id]/classify
// ============================================================================

describe('POST /api/admin/karute/[id]/classify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 without admin auth', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(false);

    const request = new Request(
      'http://localhost/api/admin/karute/karute-1/classify',
      { method: 'POST' }
    );
    const response = await classifyPOST(request, createParams('karute-1'));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('triggers classification and returns results on success', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    (classifyAndStoreEntries as jest.Mock).mockResolvedValue({
      success: true,
      entryCount: 2,
    });

    const request = new Request(
      'http://localhost/api/admin/karute/karute-1/classify',
      { method: 'POST' }
    );
    const response = await classifyPOST(request, createParams('karute-1'));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true, entryCount: 2 });
    expect(classifyAndStoreEntries).toHaveBeenCalledWith('karute-1');
  });

  it('returns 500 when classification returns error (e.g. record not found)', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    (classifyAndStoreEntries as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Karute record not found',
    });

    const request = new Request(
      'http://localhost/api/admin/karute/nonexistent/classify',
      { method: 'POST' }
    );
    const response = await classifyPOST(request, createParams('nonexistent'));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Karute record not found');
  });

  it('returns 500 when classification throws an exception', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    (classifyAndStoreEntries as jest.Mock).mockRejectedValue(
      new Error('Unexpected error')
    );

    const request = new Request(
      'http://localhost/api/admin/karute/karute-1/classify',
      { method: 'POST' }
    );
    const response = await classifyPOST(request, createParams('karute-1'));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Classification failed');
  });
});

// ============================================================================
// TESTS: GET /api/admin/karute/[id]/export
// ============================================================================

describe('GET /api/admin/karute/[id]/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 without admin auth', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(false);

    const request = new NextRequest(
      'http://localhost/api/admin/karute/karute-1/export?format=text'
    );
    const response = await exportGET(request, createParams('karute-1'));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns formatted text with correct content type for format=text', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    (generateKaruteText as jest.Mock).mockResolvedValue({
      success: true,
      text: '施術記録 / Treatment Record\n──────────────────────────\n日付: 2026/3/1',
    });

    const request = new NextRequest(
      'http://localhost/api/admin/karute/karute-1/export?format=text'
    );
    const response = await exportGET(request, createParams('karute-1'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'text/plain; charset=utf-8'
    );
    expect(response.headers.get('Content-Disposition')).toContain(
      'karute-karute-1.txt'
    );

    const text = await response.text();
    expect(text).toContain('施術記録');
    expect(generateKaruteText).toHaveBeenCalledWith('karute-1');
  });

  it('returns 404 when text export record not found', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    (generateKaruteText as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Karute record not found',
    });

    const request = new NextRequest(
      'http://localhost/api/admin/karute/nonexistent/export?format=text'
    );
    const response = await exportGET(request, createParams('nonexistent'));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Karute record not found');
  });

  it('returns PDF content type for format=pdf', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    const pdfBuffer = Buffer.from('fake-pdf-content');
    (generateKarutePDF as jest.Mock).mockResolvedValue({
      success: true,
      buffer: pdfBuffer,
    });

    const request = new NextRequest(
      'http://localhost/api/admin/karute/karute-1/export?format=pdf'
    );
    const response = await exportGET(request, createParams('karute-1'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toContain(
      'karute-karute-1.pdf'
    );
    expect(generateKarutePDF).toHaveBeenCalledWith('karute-1');
  });

  it('returns 404 when PDF export record not found', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    (generateKarutePDF as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Karute record not found',
    });

    const request = new NextRequest(
      'http://localhost/api/admin/karute/nonexistent/export?format=pdf'
    );
    const response = await exportGET(request, createParams('nonexistent'));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Karute record not found');
  });

  it('defaults to PDF when no format specified', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    const pdfBuffer = Buffer.from('fake-pdf-content');
    (generateKarutePDF as jest.Mock).mockResolvedValue({
      success: true,
      buffer: pdfBuffer,
    });

    const request = new NextRequest(
      'http://localhost/api/admin/karute/karute-1/export'
    );
    const response = await exportGET(request, createParams('karute-1'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(generateKarutePDF).toHaveBeenCalledWith('karute-1');
    expect(generateKaruteText).not.toHaveBeenCalled();
  });
});

// ============================================================================
// TESTS: GET /api/admin/karute/[id]
// ============================================================================

describe('GET /api/admin/karute/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 without admin auth', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(false);

    const request = new Request(
      'http://localhost/api/admin/karute/karute-1'
    );
    const response = await karuteGET(request, createParams('karute-1'));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns record with entries, sessions, customer, worker, and booking', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    mockRecordFindUnique.mockResolvedValue(MOCK_FULL_RECORD);

    const request = new Request(
      'http://localhost/api/admin/karute/karute-1'
    );
    const response = await karuteGET(request, createParams('karute-1'));

    expect(response.status).toBe(200);
    const body = await response.json();

    // Verify record fields
    expect(body.id).toBe('karute-1');
    expect(body.aiSummary).toBe('肩の痛みに対する施術セッション');

    // Verify entries are included
    expect(body.entries).toHaveLength(2);
    expect(body.entries[0].category).toBe('SYMPTOM');
    expect(body.entries[1].category).toBe('TREATMENT');

    // Verify relationships are included
    expect(body.customer).toEqual({ id: 'cust-1', name: '田中太郎' });
    expect(body.worker).toEqual({ id: 'worker-1', name: '鈴木花子' });
    expect(body.booking).toBeDefined();
    expect(body.booking.id).toBe('booking-1');

    // Verify recording sessions with segments are included
    expect(body.recordingSessions).toHaveLength(1);
    expect(body.recordingSessions[0].segments).toHaveLength(2);
  });

  it('returns 404 for missing record', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    mockRecordFindUnique.mockResolvedValue(null);

    const request = new Request(
      'http://localhost/api/admin/karute/nonexistent'
    );
    const response = await karuteGET(request, createParams('nonexistent'));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Karute record not found');
  });

  it('returns 500 when database throws', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    mockRecordFindUnique.mockRejectedValue(new Error('DB connection failed'));

    const request = new Request(
      'http://localhost/api/admin/karute/karute-1'
    );
    const response = await karuteGET(request, createParams('karute-1'));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Internal server error');
  });
});

// ============================================================================
// TESTS: Constants
// ============================================================================

describe('karute constants', () => {
  const EXPECTED_CATEGORIES = [
    'SYMPTOM',
    'TREATMENT',
    'BODY_AREA',
    'PREFERENCE',
    'LIFESTYLE',
    'NEXT_VISIT',
    'OTHER',
  ];

  it('CATEGORY_KEYS contains all expected categories', () => {
    expect([...CATEGORY_KEYS]).toEqual(EXPECTED_CATEGORIES);
  });

  it('CATEGORY_KEYS has exactly 7 categories', () => {
    expect(CATEGORY_KEYS).toHaveLength(7);
  });

  it('categoryColors has entries for all CATEGORY_KEYS', () => {
    for (const key of CATEGORY_KEYS) {
      expect(categoryColors[key]).toBeDefined();
      expect(typeof categoryColors[key]).toBe('string');
      // Each color should contain bg- and text- classes
      expect(categoryColors[key]).toMatch(/bg-\w+-\d+/);
      expect(categoryColors[key]).toMatch(/text-\w+-\d+/);
    }
  });

  it('categoryColors has no extra keys beyond CATEGORY_KEYS', () => {
    const colorKeys = Object.keys(categoryColors);
    expect(colorKeys.sort()).toEqual([...EXPECTED_CATEGORIES].sort());
  });
});
