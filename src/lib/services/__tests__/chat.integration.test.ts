/**
 * @jest-environment node
 */

/**
 * Chat Service & API Integration Tests (Phase 6)
 *
 * Tests the chat service (conversation management, context building, message
 * persistence) and chat API routes. All external dependencies (Prisma, OpenAI,
 * auth) are mocked — no real database or API calls.
 *
 * Uses jest.fn() delegation pattern consistent with existing test files.
 */

// ============================================================================
// MOCKS — must be declared before imports due to jest.mock hoisting
// ============================================================================

const mockConversationFindFirst = jest.fn();
const mockConversationCreate = jest.fn();
const mockConversationUpdate = jest.fn();
const mockMessageFindMany = jest.fn();
const mockMessageCreate = jest.fn();
const mockMessageCount = jest.fn();
const mockCustomerFindUnique = jest.fn();
const mockKaruteRecordFindMany = jest.fn();
const mockBookingFindMany = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@/lib/db/client', () => ({
  prisma: {
    chatConversation: {
      findFirst: (...args: unknown[]) => mockConversationFindFirst(...args),
      create: (...args: unknown[]) => mockConversationCreate(...args),
      update: (...args: unknown[]) => mockConversationUpdate(...args),
    },
    chatMessage: {
      findMany: (...args: unknown[]) => mockMessageFindMany(...args),
      create: (...args: unknown[]) => mockMessageCreate(...args),
      count: (...args: unknown[]) => mockMessageCount(...args),
    },
    customer: {
      findUnique: (...args: unknown[]) => mockCustomerFindUnique(...args),
    },
    karuteRecord: {
      findMany: (...args: unknown[]) => mockKaruteRecordFindMany(...args),
    },
    booking: {
      findMany: (...args: unknown[]) => mockBookingFindMany(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

const mockChatCompletionsCreate = jest.fn();
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args: unknown[]) => mockChatCompletionsCreate(...args),
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

// ============================================================================
// IMPORTS
// ============================================================================

import { getAdminSession } from '@/lib/auth/admin';
import {
  getOrCreateConversation,
  getConversation,
  getChatHistory,
  buildChatContext,
  saveMessage,
} from '@/lib/services/chat.service';
import { sendMessageSchema } from '@/lib/validations/chat';

// Import API route handlers
import { POST as chatPOST } from '@/app/api/admin/chat/route';
import { GET as historyGET } from '@/app/api/admin/chat/history/[customerId]/route';

// ============================================================================
// TEST DATA
// ============================================================================

const MOCK_CUSTOMER = {
  name: '田中太郎',
  notes: '肩こりが慢性的',
  visitCount: 5,
  lastVisitDate: new Date('2026-03-01'),
  email: 'tanaka@example.com',
  phone: '090-1234-5678',
};

const MOCK_KARUTE_RECORDS = [
  {
    id: 'karute-1',
    customerId: 'cust-1',
    createdAt: new Date('2026-03-01'),
    aiSummary: '肩こりに対する施術',
    worker: { name: '鈴木花子' },
    entries: [
      { category: 'SYMPTOM', content: '肩の痛み' },
      { category: 'TREATMENT', content: '肩周りのほぐし' },
    ],
  },
  {
    id: 'karute-2',
    customerId: 'cust-1',
    createdAt: new Date('2026-02-15'),
    aiSummary: '腰痛の施術',
    worker: { name: '鈴木花子' },
    entries: [
      { category: 'SYMPTOM', content: '腰の張り' },
    ],
  },
];

const MOCK_BOOKINGS = [
  {
    startsAt: new Date('2026-03-01T10:00:00Z'),
    service: { name: '整体コース', nameEn: 'Chiropractic Course' },
    worker: { name: '鈴木花子' },
  },
];

const MOCK_CONVERSATION = {
  id: 'conv-1',
  customerId: 'cust-1',
  title: '肩の状態について',
  createdAt: new Date('2026-03-01T09:00:00Z'),
  updatedAt: new Date('2026-03-01T09:05:00Z'),
  messages: [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: '肩の状態について教えてください',
      citations: null,
      tokenCount: null,
      createdAt: new Date('2026-03-01T09:00:00Z'),
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      role: 'assistant',
      content: '田中様の肩について[KR:karute-1]を参考にすると、慢性的な肩こりがあります。',
      citations: [{ karuteId: 'karute-1', label: 'KR:karute-1' }],
      tokenCount: 150,
      createdAt: new Date('2026-03-01T09:01:00Z'),
    },
  ],
};

// ============================================================================
// HELPERS
// ============================================================================

function createParams(customerId: string): { params: Promise<{ customerId: string }> } {
  return { params: Promise.resolve({ customerId }) };
}

// ============================================================================
// TESTS: sendMessageSchema validation
// ============================================================================

describe('sendMessageSchema validation', () => {
  it('validates a minimal message', () => {
    const result = sendMessageSchema.safeParse({ message: 'こんにちは' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe('こんにちは');
      expect(result.data.customerId).toBeNull();
      expect(result.data.conversationId).toBeNull();
      expect(result.data.locale).toBe('ja');
    }
  });

  it('validates a full message with all fields', () => {
    const result = sendMessageSchema.safeParse({
      message: 'Tell me about this customer',
      customerId: 'cust-1',
      conversationId: 'conv-1',
      locale: 'en',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerId).toBe('cust-1');
      expect(result.data.conversationId).toBe('conv-1');
      expect(result.data.locale).toBe('en');
    }
  });

  it('rejects empty message', () => {
    const result = sendMessageSchema.safeParse({ message: '' });
    expect(result.success).toBe(false);
  });

  it('rejects message exceeding 2000 characters', () => {
    const result = sendMessageSchema.safeParse({ message: 'x'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from message', () => {
    const result = sendMessageSchema.safeParse({ message: '  hello  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe('hello');
    }
  });

  it('rejects invalid locale', () => {
    const result = sendMessageSchema.safeParse({ message: 'hi', locale: 'fr' });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// TESTS: getOrCreateConversation
// ============================================================================

describe('getOrCreateConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new conversation when none exists', async () => {
    const newConv = {
      id: 'conv-new',
      customerId: 'cust-1',
      title: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
    };

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        chatConversation: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(newConv),
        },
        chatMessage: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      };
      return fn(tx);
    });

    const result = await getOrCreateConversation('cust-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('conv-new');
      expect(result.data.customerId).toBe('cust-1');
      expect(result.data.messages).toEqual([]);
    }
  });

  it('reuses existing conversation when last message is within 24h', async () => {
    const recentMessage = {
      id: 'msg-1',
      createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    };

    const existingConv = {
      id: 'conv-existing',
      customerId: 'cust-1',
      title: 'Old conversation',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [recentMessage],
    };

    const allMessages = [
      { id: 'msg-1', role: 'user', content: 'hello', citations: null, tokenCount: null, createdAt: new Date() },
    ];

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        chatConversation: {
          findFirst: jest.fn().mockResolvedValue(existingConv),
        },
        chatMessage: {
          findMany: jest.fn().mockResolvedValue(allMessages),
        },
      };
      return fn(tx);
    });

    const result = await getOrCreateConversation('cust-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('conv-existing');
      expect(result.data.messages).toHaveLength(1);
    }
  });

  it('creates new conversation when last message is older than 24h', async () => {
    const oldMessage = {
      id: 'msg-old',
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
    };

    const existingConv = {
      id: 'conv-old',
      customerId: 'cust-1',
      title: 'Old',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [oldMessage],
    };

    const newConv = {
      id: 'conv-new',
      customerId: 'cust-1',
      title: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
    };

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        chatConversation: {
          findFirst: jest.fn().mockResolvedValue(existingConv),
          create: jest.fn().mockResolvedValue(newConv),
        },
      };
      return fn(tx);
    });

    const result = await getOrCreateConversation('cust-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('conv-new');
    }
  });

  it('handles global conversations (null customerId)', async () => {
    const globalConv = {
      id: 'conv-global',
      customerId: null,
      title: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
    };

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        chatConversation: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(globalConv),
        },
      };
      return fn(tx);
    });

    const result = await getOrCreateConversation(null);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerId).toBeNull();
    }
  });

  it('returns error on database failure', async () => {
    mockTransaction.mockRejectedValue(new Error('Connection lost'));

    const result = await getOrCreateConversation('cust-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Connection lost');
    }
    expect(mockCaptureException).toHaveBeenCalled();
  });
});

// ============================================================================
// TESTS: getConversation (read-only)
// ============================================================================

describe('getConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns existing conversation with messages', async () => {
    mockConversationFindFirst.mockResolvedValue(MOCK_CONVERSATION);

    const result = await getConversation('cust-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toBeNull();
      expect(result.data!.id).toBe('conv-1');
      expect(result.data!.messages).toHaveLength(2);
    }
  });

  it('returns null when no conversation exists', async () => {
    mockConversationFindFirst.mockResolvedValue(null);

    const result = await getConversation('cust-no-conv');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('returns error on database failure', async () => {
    mockConversationFindFirst.mockRejectedValue(new Error('DB error'));

    const result = await getConversation('cust-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('DB error');
    }
    expect(mockCaptureException).toHaveBeenCalled();
  });
});

// ============================================================================
// TESTS: getChatHistory
// ============================================================================

describe('getChatHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns last 20 messages formatted for OpenAI', async () => {
    mockMessageFindMany.mockResolvedValue([
      { role: 'assistant', content: 'こんにちは' },
      { role: 'user', content: '肩が痛いです' },
    ]);

    const result = await getChatHistory('conv-1');

    expect(result.success).toBe(true);
    if (result.success) {
      // Messages should be reversed (desc -> asc)
      expect(result.data).toEqual([
        { role: 'user', content: '肩が痛いです' },
        { role: 'assistant', content: 'こんにちは' },
      ]);
    }
  });

  it('returns empty array for conversation with no messages', async () => {
    mockMessageFindMany.mockResolvedValue([]);

    const result = await getChatHistory('conv-empty');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  it('returns error on failure', async () => {
    mockMessageFindMany.mockRejectedValue(new Error('Query failed'));

    const result = await getChatHistory('conv-1');

    expect(result.success).toBe(false);
    expect(mockCaptureException).toHaveBeenCalled();
  });
});

// ============================================================================
// TESTS: buildChatContext
// ============================================================================

describe('buildChatContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds customer-scoped context with profile, karute records, and bookings', async () => {
    mockCustomerFindUnique.mockResolvedValue(MOCK_CUSTOMER);
    mockKaruteRecordFindMany.mockResolvedValue(MOCK_KARUTE_RECORDS);
    mockBookingFindMany.mockResolvedValue(MOCK_BOOKINGS);

    const result = await buildChatContext('cust-1', 'ja');

    expect(result.success).toBe(true);
    if (result.success) {
      const context = result.data;
      // Should contain customer profile
      expect(context).toContain('田中太郎');
      expect(context).toContain('来院回数: 5回');
      // Should contain karute data
      expect(context).toContain('肩の痛み');
      expect(context).toContain('SYMPTOM');
      // Should contain booking data
      expect(context).toContain('整体コース');
      // Should contain Japanese instruction
      expect(context).toContain('日本語で回答してください');
      // Should contain citation instructions
      expect(context).toContain('[KR:record_id]');
    }
  });

  it('builds English context when locale is en', async () => {
    mockCustomerFindUnique.mockResolvedValue(MOCK_CUSTOMER);
    mockKaruteRecordFindMany.mockResolvedValue([]);
    mockBookingFindMany.mockResolvedValue([]);

    const result = await buildChatContext('cust-1', 'en');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toContain('Respond in English.');
    }
  });

  it('returns error when customer not found', async () => {
    mockCustomerFindUnique.mockResolvedValue(null);
    mockKaruteRecordFindMany.mockResolvedValue([]);
    mockBookingFindMany.mockResolvedValue([]);

    const result = await buildChatContext('nonexistent', 'ja');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Customer not found');
    }
  });

  it('builds global context when customerId is null', async () => {
    mockKaruteRecordFindMany.mockResolvedValue([
      {
        createdAt: new Date('2026-03-01'),
        aiSummary: '肩こり施術',
        customer: { name: '田中太郎' },
        worker: { name: '鈴木花子' },
      },
    ]);

    const result = await buildChatContext(null, 'ja');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toContain('院全体について');
      expect(result.data).toContain('田中太郎');
      expect(result.data).toContain('肩こり施術');
    }
  });

  it('includes customer notes in profile when present', async () => {
    mockCustomerFindUnique.mockResolvedValue(MOCK_CUSTOMER);
    mockKaruteRecordFindMany.mockResolvedValue([]);
    mockBookingFindMany.mockResolvedValue([]);

    const result = await buildChatContext('cust-1', 'ja');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toContain('メモ: 肩こりが慢性的');
    }
  });

  it('uses aiSummary for older records (beyond first 3)', async () => {
    const manyRecords = Array.from({ length: 5 }, (_, i) => ({
      id: `karute-${i}`,
      customerId: 'cust-1',
      createdAt: new Date(`2026-0${3 - i < 1 ? 1 : 3 - i}-01`),
      aiSummary: `施術サマリー${i}`,
      worker: { name: '鈴木花子' },
      entries: [{ category: 'SYMPTOM', content: `症状${i}` }],
    }));

    mockCustomerFindUnique.mockResolvedValue(MOCK_CUSTOMER);
    mockKaruteRecordFindMany.mockResolvedValue(manyRecords);
    mockBookingFindMany.mockResolvedValue([]);

    const result = await buildChatContext('cust-1', 'ja');

    expect(result.success).toBe(true);
    if (result.success) {
      // First 3 records should have full entries
      expect(result.data).toContain('症状0');
      expect(result.data).toContain('症状1');
      expect(result.data).toContain('症状2');
      // Older records should use aiSummary only
      expect(result.data).toContain('施術サマリー3');
    }
  });
});

// ============================================================================
// TESTS: saveMessage
// ============================================================================

describe('saveMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConversationUpdate.mockResolvedValue({});
  });

  it('saves a user message and sets title if first user message', async () => {
    mockMessageCreate.mockResolvedValue({ id: 'msg-new' });
    mockMessageCount.mockResolvedValue(1); // first user message

    const result = await saveMessage('conv-1', 'user', '肩の状態は？');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('msg-new');
    }
    // Should set title from first user message
    expect(mockConversationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: '肩の状態は？',
        }),
      })
    );
  });

  it('saves a user message without setting title if not first', async () => {
    mockMessageCreate.mockResolvedValue({ id: 'msg-2' });
    mockMessageCount.mockResolvedValue(3); // not first

    await saveMessage('conv-1', 'user', 'もう一つ質問');

    expect(mockConversationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          title: expect.anything(),
        }),
      })
    );
  });

  it('saves an assistant message with citations', async () => {
    mockMessageCreate.mockResolvedValue({ id: 'msg-asst' });

    const citations = [{ karuteId: 'karute-1', label: 'KR:karute-1' }];
    const result = await saveMessage('conv-1', 'assistant', 'レスポンス', citations, 200);

    expect(result.success).toBe(true);
    expect(mockMessageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'assistant',
          citations,
          tokenCount: 200,
        }),
      })
    );
  });

  it('truncates title to 50 characters', async () => {
    mockMessageCreate.mockResolvedValue({ id: 'msg-long' });
    mockMessageCount.mockResolvedValue(1);

    const longMessage = 'あ'.repeat(100);
    await saveMessage('conv-1', 'user', longMessage);

    expect(mockConversationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'あ'.repeat(50),
        }),
      })
    );
  });

  it('returns error on database failure', async () => {
    mockMessageCreate.mockRejectedValue(new Error('Write failed'));

    const result = await saveMessage('conv-1', 'user', 'test');

    expect(result.success).toBe(false);
    expect(mockCaptureException).toHaveBeenCalled();
  });
});

// ============================================================================
// TESTS: POST /api/admin/chat
// ============================================================================

describe('POST /api/admin/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it('returns 401 without admin auth', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(false);

    const request = new Request('http://localhost/api/admin/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    });
    const response = await chatPOST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 for invalid JSON', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);

    const request = new Request('http://localhost/api/admin/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const response = await chatPOST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid JSON');
  });

  it('returns 400 for invalid input (empty message)', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);

    const request = new Request('http://localhost/api/admin/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    });
    const response = await chatPOST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid input');
    expect(body.details).toBeDefined();
  });

  it('returns SSE stream with conversationId, content chunks, and DONE', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);

    // Mock getOrCreateConversation (via $transaction)
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        chatConversation: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'conv-stream',
            customerId: null,
            title: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            messages: [],
          }),
        },
        chatMessage: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      };
      return fn(tx);
    });

    // Mock getChatHistory
    mockMessageFindMany.mockResolvedValue([]);

    // Mock buildChatContext (global mode)
    mockKaruteRecordFindMany.mockResolvedValue([]);

    // Mock saveMessage
    mockMessageCreate.mockResolvedValue({ id: 'msg-1' });
    mockMessageCount.mockResolvedValue(1);
    mockConversationUpdate.mockResolvedValue({});

    // Mock OpenAI streaming response
    const chunks = [
      { choices: [{ delta: { content: 'こんに' } }] },
      { choices: [{ delta: { content: 'ちは' } }] },
      { choices: [{ delta: {} }], usage: { total_tokens: 42 } },
    ];

    mockChatCompletionsCreate.mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      },
    });

    const request = new Request('http://localhost/api/admin/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '質問です' }),
    });
    const response = await chatPOST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');

    // Read the stream
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    // Verify SSE format
    expect(fullText).toContain('data: {"conversationId":"conv-stream"}');
    expect(fullText).toContain('data: {"content":"こんに"}');
    expect(fullText).toContain('data: {"content":"ちは"}');
    expect(fullText).toContain('data: [DONE]');
  });
});

// ============================================================================
// TESTS: GET /api/admin/chat/history/[customerId]
// ============================================================================

describe('GET /api/admin/chat/history/[customerId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 without admin auth', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(false);

    const request = new Request('http://localhost/api/admin/chat/history/cust-1');
    const response = await historyGET(request, createParams('cust-1'));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns conversation with messages for existing customer', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    mockConversationFindFirst.mockResolvedValue(MOCK_CONVERSATION);

    const request = new Request('http://localhost/api/admin/chat/history/cust-1');
    const response = await historyGET(request, createParams('cust-1'));

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.conversation.id).toBe('conv-1');
    expect(body.conversation.customerId).toBe('cust-1');
    expect(body.conversation.title).toBe('肩の状態について');
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('user');
    expect(body.messages[1].role).toBe('assistant');
    expect(body.messages[1].citations).toBeDefined();
  });

  it('returns null conversation and empty messages when no history', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    mockConversationFindFirst.mockResolvedValue(null);

    const request = new Request('http://localhost/api/admin/chat/history/cust-new');
    const response = await historyGET(request, createParams('cust-new'));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.conversation).toBeNull();
    expect(body.messages).toEqual([]);
  });

  it('returns 500 when service returns error', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    mockConversationFindFirst.mockRejectedValue(new Error('DB timeout'));

    const request = new Request('http://localhost/api/admin/chat/history/cust-1');
    const response = await historyGET(request, createParams('cust-1'));

    expect(response.status).toBe(500);
  });
});

// ============================================================================
// TESTS: Citation parsing (via POST route streaming)
// ============================================================================

describe('citation parsing in chat route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it('parses [KR:uuid] citations from AI response and saves them', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);

    // Mock conversation creation
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        chatConversation: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'conv-cite',
            customerId: null,
            title: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            messages: [],
          }),
        },
        chatMessage: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      };
      return fn(tx);
    });

    mockMessageFindMany.mockResolvedValue([]);
    mockKaruteRecordFindMany.mockResolvedValue([]);
    mockMessageCreate.mockResolvedValue({ id: 'msg-1' });
    mockMessageCount.mockResolvedValue(1);
    mockConversationUpdate.mockResolvedValue({});

    const karuteId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const aiResponse = `施術記録を参照すると[KR:${karuteId}]、肩こりが主な症状です。`;

    const chunks = [
      { choices: [{ delta: { content: aiResponse } }] },
      { choices: [{ delta: {} }], usage: { total_tokens: 100 } },
    ];

    mockChatCompletionsCreate.mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        for (const chunk of chunks) yield chunk;
      },
    });

    const request = new Request('http://localhost/api/admin/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '肩の状態は？' }),
    });

    const response = await chatPOST(request);

    // Consume the stream to trigger save
    const reader = response.body!.getReader();
    while (!(await reader.read()).done) { /* drain */ }

    // The second call to mockMessageCreate is the assistant message save
    // First call is the user message, second is the assistant message
    const assistantSaveCall = mockMessageCreate.mock.calls[1];
    expect(assistantSaveCall[0].data.citations).toEqual([
      { karuteId, label: `KR:${karuteId.slice(0, 8)}` },
    ]);
  });
});
