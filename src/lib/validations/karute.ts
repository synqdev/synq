/**
 * Karute Validation Schemas
 *
 * Zod schemas for validating karute record, entry, and recording session
 * input data before database operations. Ensures data integrity and
 * provides type inference for TypeScript.
 */

import { z } from 'zod';

// ============================================================================
// KARUTE RECORD SCHEMAS
// ============================================================================

/**
 * Schema for creating a new karute record.
 */
export const createKaruteRecordSchema = z.object({
  customerId: z.string().min(1, { message: 'Customer ID is required' }),
  workerId: z.string().min(1, { message: 'Worker ID is required' }),
  bookingId: z.string().min(1).optional(),
});

export type CreateKaruteRecordInput = z.infer<typeof createKaruteRecordSchema>;

/**
 * Schema for updating an existing karute record.
 */
export const updateKaruteRecordSchema = z.object({
  id: z.string().min(1, { message: 'Record ID is required' }),
  aiSummary: z.string().optional(),
  status: z.enum(['DRAFT', 'REVIEW', 'APPROVED']).optional(),
});

export type UpdateKaruteRecordInput = z.infer<typeof updateKaruteRecordSchema>;

// ============================================================================
// KARUTE ENTRY SCHEMAS
// ============================================================================

/**
 * Schema for creating a new karute entry.
 */
export const createKaruteEntrySchema = z.object({
  karuteId: z.string().min(1, { message: 'Karute ID is required' }),
  category: z.enum([
    'SYMPTOM',
    'TREATMENT',
    'BODY_AREA',
    'PREFERENCE',
    'LIFESTYLE',
    'NEXT_VISIT',
    'OTHER',
  ]),
  content: z.string().min(1, { message: 'Content is required' }),
  originalQuote: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0),
});

export type CreateKaruteEntryInput = z.infer<typeof createKaruteEntrySchema>;

/**
 * Schema for updating an existing karute entry.
 */
export const updateKaruteEntrySchema = z.object({
  id: z.string().min(1, { message: 'Entry ID is required' }),
  category: z
    .enum([
      'SYMPTOM',
      'TREATMENT',
      'BODY_AREA',
      'PREFERENCE',
      'LIFESTYLE',
      'NEXT_VISIT',
      'OTHER',
    ])
    .optional(),
  content: z.string().min(1).optional(),
  originalQuote: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).optional(),
});

export type UpdateKaruteEntryInput = z.infer<typeof updateKaruteEntrySchema>;

// ============================================================================
// CLASSIFICATION SCHEMAS
// ============================================================================

/**
 * Schema for validating a classify request (karute record ID).
 */
export const classifyKaruteSchema = z.object({
  karuteRecordId: z.string().uuid(),
});

export type ClassifyKaruteInput = z.infer<typeof classifyKaruteSchema>;

/**
 * Schema for updating karute record status.
 */
export const updateKaruteStatusSchema = z.object({
  status: z.enum(['DRAFT', 'REVIEW', 'APPROVED']),
});

export type UpdateKaruteStatusInput = z.infer<typeof updateKaruteStatusSchema>;

/**
 * Schema for updating karute entry tags.
 */
export const updateKaruteEntryTagsSchema = z.object({
  tags: z.array(z.string()),
});

export type UpdateKaruteEntryTagsInput = z.infer<typeof updateKaruteEntryTagsSchema>;

// ============================================================================
// RECORDING SESSION SCHEMAS
// ============================================================================

/**
 * Schema for creating a new recording session.
 */
export const createRecordingSessionSchema = z.object({
  customerId: z.string().min(1, { message: 'Customer ID is required' }),
  workerId: z.string().min(1, { message: 'Worker ID is required' }),
  karuteRecordId: z.string().min(1).optional(),
  bookingId: z.string().min(1).optional(),
});

export type CreateRecordingSessionInput = z.infer<typeof createRecordingSessionSchema>;

/**
 * Schema for updating an existing recording session.
 */
export const updateRecordingSessionSchema = z.object({
  id: z.string().min(1, { message: 'Session ID is required' }),
  status: z.enum(['RECORDING', 'PAUSED', 'COMPLETED', 'PROCESSING', 'FAILED']).optional(),
  audioStoragePath: z.string().optional(),
  durationSeconds: z.number().int().min(0).optional(),
  endedAt: z.date().optional(),
  karuteRecordId: z.string().min(1).optional(),
});

export type UpdateRecordingSessionInput = z.infer<typeof updateRecordingSessionSchema>;
