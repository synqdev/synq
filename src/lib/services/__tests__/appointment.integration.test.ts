/**
 * @jest-environment node
 */

/**
 * Appointment & Settings API Integration Tests (Phase 7)
 *
 * Tests the appointment detail, today's appointments, and admin settings
 * API routes. All external dependencies (Prisma, auth, time utils) are
 * mocked — no real database or API calls.
 *
 * Uses jest.fn() delegation pattern consistent with existing test files.
 */

// ============================================================================
// MOCKS — must be declared before imports due to jest.mock hoisting
// ============================================================================

const mockBookingFindUnique = jest.fn();
const mockBookingFindMany = jest.fn();
const mockSettingsUpsert = jest.fn();

jest.mock('@/lib/db/client', () => ({
  prisma: {
    booking: {
      findUnique: (...args: unknown[]) => mockBookingFindUnique(...args),
      findMany: (...args: unknown[]) => mockBookingFindMany(...args),
    },
    adminSettings: {
      upsert: (...args: unknown[]) => mockSettingsUpsert(...args),
    },
  },
}));

jest.mock('@/lib/auth/admin', () => ({
  getAdminSession: jest.fn(),
}));

jest.mock('@/lib/utils/time', () => ({
  toZonedTime: jest.fn((date: string, time: string) => {
    // Simple mock: parse date + time as UTC
    return new Date(`${date}T${time}:00.000Z`);
  }),
  formatInTimeZone: jest.fn(() => ({
    date: '2026-03-08',
    time: '10:00',
  })),
}));

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}));

// ============================================================================
// IMPORTS
// ============================================================================

import { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';

import { GET as appointmentGET } from '@/app/api/admin/appointment/[id]/route';
import { GET as todayGET } from '@/app/api/admin/appointment/today/route';
import { GET as settingsGET, PUT as settingsPUT } from '@/app/api/admin/settings/route';

// ============================================================================
// TEST DATA
// ============================================================================

const MOCK_BOOKING = {
  id: 'booking-1',
  startsAt: new Date('2026-03-08T10:00:00Z'),
  endsAt: new Date('2026-03-08T11:00:00Z'),
  status: 'CONFIRMED',
  customer: {
    id: 'cust-1',
    name: '田中太郎',
    email: 'tanaka@example.com',
    phone: '090-1234-5678',
    locale: 'ja',
    notes: '肩こりが慢性的',
  },
  worker: {
    id: 'worker-1',
    name: '鈴木花子',
    nameEn: 'Hanako Suzuki',
  },
  service: {
    id: 'service-1',
    name: '整体コース',
    nameEn: 'Chiropractic Course',
    duration: 60,
  },
  karuteRecords: [
    {
      id: 'karute-1',
      status: 'DRAFT',
      createdAt: new Date('2026-03-08T10:30:00Z'),
      aiSummary: '肩こりに対する施術',
    },
  ],
  recordingSessions: [
    {
      id: 'rec-1',
      status: 'COMPLETED',
      startedAt: new Date('2026-03-08T10:00:00Z'),
      endedAt: new Date('2026-03-08T10:45:00Z'),
      audioStoragePath: 'recordings/rec-1.webm',
      durationSeconds: 2700,
    },
  ],
};

const MOCK_TODAY_BOOKINGS = [
  {
    id: 'booking-1',
    startsAt: new Date('2026-03-08T01:00:00Z'), // 10:00 JST
    endsAt: new Date('2026-03-08T02:00:00Z'),
    status: 'CONFIRMED',
    customer: { name: '田中太郎' },
    service: { name: '整体コース', nameEn: 'Chiropractic Course' },
    worker: { name: '鈴木花子' },
    karuteRecords: [{ id: 'karute-1', status: 'APPROVED' }],
  },
  {
    id: 'booking-2',
    startsAt: new Date('2026-03-08T03:00:00Z'), // 12:00 JST
    endsAt: new Date('2026-03-08T04:00:00Z'),
    status: 'CONFIRMED',
    customer: { name: '佐藤次郎' },
    service: { name: 'マッサージ', nameEn: 'Massage' },
    worker: { name: '鈴木花子' },
    karuteRecords: [],
  },
];

const MOCK_SETTINGS = {
  id: 'default',
  aiProvider: 'openai',
  businessType: 'general',
  autoTranscribe: true,
  recordingLang: 'ja',
  audioQuality: 'standard',
  updatedAt: new Date('2026-03-08T00:00:00Z'),
};

// ============================================================================
// HELPERS
// ============================================================================

function createIdParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

// ============================================================================
// TESTS: GET /api/admin/appointment/[id]
// ============================================================================

describe('GET /api/admin/appointment/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 without admin auth', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(false);

    const request = new NextRequest('http://localhost/api/admin/appointment/booking-1');
    const response = await appointmentGET(request, createIdParams('booking-1'));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns full booking with all relations', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    mockBookingFindUnique.mockResolvedValue(MOCK_BOOKING);

    const request = new NextRequest('http://localhost/api/admin/appointment/booking-1');
    const response = await appointmentGET(request, createIdParams('booking-1'));

    expect(response.status).toBe(200);
    const body = await response.json();

    // Verify booking fields
    expect(body.id).toBe('booking-1');
    expect(body.status).toBe('CONFIRMED');

    // Verify customer relation
    expect(body.customer.id).toBe('cust-1');
    expect(body.customer.name).toBe('田中太郎');
    expect(body.customer.email).toBe('tanaka@example.com');
    expect(body.customer.notes).toBe('肩こりが慢性的');

    // Verify worker relation
    expect(body.worker.id).toBe('worker-1');
    expect(body.worker.name).toBe('鈴木花子');
    expect(body.worker.nameEn).toBe('Hanako Suzuki');

    // Verify service relation
    expect(body.service.id).toBe('service-1');
    expect(body.service.duration).toBe(60);

    // Verify karute records
    expect(body.karuteRecords).toHaveLength(1);
    expect(body.karuteRecords[0].status).toBe('DRAFT');

    // Verify recording sessions
    expect(body.recordingSessions).toHaveLength(1);
    expect(body.recordingSessions[0].status).toBe('COMPLETED');
  });

  it('returns 404 for non-existent booking', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    mockBookingFindUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/admin/appointment/nonexistent');
    const response = await appointmentGET(request, createIdParams('nonexistent'));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Not found');
  });

  it('includes correct Prisma query shape', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    mockBookingFindUnique.mockResolvedValue(MOCK_BOOKING);

    const request = new NextRequest('http://localhost/api/admin/appointment/booking-1');
    await appointmentGET(request, createIdParams('booking-1'));

    // Verify the query includes all expected relations
    const call = mockBookingFindUnique.mock.calls[0][0];
    expect(call.where.id).toBe('booking-1');
    expect(call.include.customer).toBeDefined();
    expect(call.include.worker).toBeDefined();
    expect(call.include.service).toBeDefined();
    expect(call.include.karuteRecords).toBeDefined();
    expect(call.include.recordingSessions).toBeDefined();
  });
});

// ============================================================================
// TESTS: GET /api/admin/appointment/today
// ============================================================================

describe('GET /api/admin/appointment/today', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 without admin auth', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(false);

    const request = new NextRequest('http://localhost/api/admin/appointment/today');
    const response = await todayGET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns today bookings with hasKarute and karuteStatus', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    mockBookingFindMany.mockResolvedValue(MOCK_TODAY_BOOKINGS);

    const request = new NextRequest('http://localhost/api/admin/appointment/today');
    const response = await todayGET(request);

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.bookings).toHaveLength(2);

    // First booking has karute
    expect(body.bookings[0].id).toBe('booking-1');
    expect(body.bookings[0].customerName).toBe('田中太郎');
    expect(body.bookings[0].serviceName).toBe('整体コース');
    expect(body.bookings[0].workerName).toBe('鈴木花子');
    expect(body.bookings[0].hasKarute).toBe(true);
    expect(body.bookings[0].karuteStatus).toBe('APPROVED');

    // Second booking has no karute
    expect(body.bookings[1].id).toBe('booking-2');
    expect(body.bookings[1].hasKarute).toBe(false);
    expect(body.bookings[1].karuteStatus).toBeNull();
  });

  it('accepts date query parameter', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    mockBookingFindMany.mockResolvedValue([]);

    const request = new NextRequest(
      'http://localhost/api/admin/appointment/today?date=2026-03-10'
    );
    await todayGET(request);

    // Verify query uses the provided date boundaries
    const call = mockBookingFindMany.mock.calls[0][0];
    expect(call.where.startsAt.gte).toEqual(new Date('2026-03-10T00:00:00.000Z'));
    expect(call.where.status.notIn).toEqual(['CANCELLED', 'NOSHOW']);
    expect(call.orderBy.startsAt).toBe('asc');
  });

  it('excludes CANCELLED and NOSHOW bookings', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    mockBookingFindMany.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/admin/appointment/today');
    await todayGET(request);

    const call = mockBookingFindMany.mock.calls[0][0];
    expect(call.where.status.notIn).toContain('CANCELLED');
    expect(call.where.status.notIn).toContain('NOSHOW');
  });

  it('returns empty bookings array when none exist', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    mockBookingFindMany.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/admin/appointment/today');
    const response = await todayGET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.bookings).toEqual([]);
  });

  it('serializes dates as ISO strings', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    mockBookingFindMany.mockResolvedValue(MOCK_TODAY_BOOKINGS);

    const request = new NextRequest('http://localhost/api/admin/appointment/today');
    const response = await todayGET(request);

    const body = await response.json();
    // startsAt and endsAt should be ISO strings
    expect(typeof body.bookings[0].startsAt).toBe('string');
    expect(body.bookings[0].startsAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ============================================================================
// TESTS: GET /api/admin/settings
// ============================================================================

describe('GET /api/admin/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 without admin auth', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(false);

    const response = await settingsGET();

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns settings with defaults via upsert', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    mockSettingsUpsert.mockResolvedValue(MOCK_SETTINGS);

    const response = await settingsGET();

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.id).toBe('default');
    expect(body.aiProvider).toBe('openai');
    expect(body.businessType).toBe('general');
    expect(body.autoTranscribe).toBe(true);
    expect(body.recordingLang).toBe('ja');
    expect(body.audioQuality).toBe('standard');
  });

  it('uses upsert with default id to ensure row exists', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);
    mockSettingsUpsert.mockResolvedValue(MOCK_SETTINGS);

    await settingsGET();

    const call = mockSettingsUpsert.mock.calls[0][0];
    expect(call.where.id).toBe('default');
    expect(call.create.id).toBe('default');
  });
});

// ============================================================================
// TESTS: PUT /api/admin/settings
// ============================================================================

describe('PUT /api/admin/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 without admin auth', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(false);

    const request = new NextRequest('http://localhost/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await settingsPUT(request);

    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid JSON', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);

    const request = new NextRequest('http://localhost/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const response = await settingsPUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid JSON');
  });

  it('returns 400 for invalid settings data', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);

    const request = new NextRequest('http://localhost/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aiProvider: '', // too short
        businessType: 'invalid', // not in enum
        autoTranscribe: 'yes', // not boolean
        recordingLang: 'fr', // not in enum
        audioQuality: 'ultra', // not in enum
      }),
    });
    const response = await settingsPUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toBeDefined();
  });

  it('updates settings with valid data', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);

    const updatedSettings = {
      ...MOCK_SETTINGS,
      aiProvider: 'anthropic',
      businessType: 'salon',
      autoTranscribe: false,
      recordingLang: 'en',
      audioQuality: 'high',
    };
    mockSettingsUpsert.mockResolvedValue(updatedSettings);

    const request = new NextRequest('http://localhost/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aiProvider: 'anthropic',
        businessType: 'salon',
        autoTranscribe: false,
        recordingLang: 'en',
        audioQuality: 'high',
      }),
    });
    const response = await settingsPUT(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.aiProvider).toBe('anthropic');
    expect(body.businessType).toBe('salon');
    expect(body.autoTranscribe).toBe(false);
    expect(body.recordingLang).toBe('en');
    expect(body.audioQuality).toBe('high');

    // Verify upsert was called with correct data
    const call = mockSettingsUpsert.mock.calls[0][0];
    expect(call.where.id).toBe('default');
    expect(call.update.aiProvider).toBe('anthropic');
    expect(call.create.id).toBe('default');
  });

  it('validates each businessType enum value', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);

    for (const type of ['general', 'salon', 'clinic']) {
      mockSettingsUpsert.mockResolvedValue({ ...MOCK_SETTINGS, businessType: type });

      const request = new NextRequest('http://localhost/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiProvider: 'openai',
          businessType: type,
          autoTranscribe: true,
          recordingLang: 'ja',
          audioQuality: 'standard',
        }),
      });
      const response = await settingsPUT(request);
      expect(response.status).toBe(200);
    }
  });

  it('rejects missing required fields', async () => {
    (getAdminSession as jest.Mock).mockResolvedValue(true);

    const request = new NextRequest('http://localhost/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aiProvider: 'openai',
        // missing other required fields
      }),
    });
    const response = await settingsPUT(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
  });
});
