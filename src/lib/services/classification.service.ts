/**
 * Classification Service
 *
 * Uses OpenAI gpt-4o structured outputs to classify transcription segments
 * into structured karute entries with categories, confidence scores,
 * original quotes, and segment index references. Also generates a brief
 * narrative summary of the treatment session.
 *
 * OpenAI client is created lazily (per 04-02 decision) to allow module
 * import without API key during tests and builds.
 *
 * CRITICAL: Uses z.toJSONSchema() instead of zodResponseFormat because
 * this project uses Zod v4, which is incompatible with OpenAI's
 * zodResponseFormat helper.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import * as Sentry from '@sentry/nextjs';

// ============================================================================
// OPENAI CLIENT (LAZY)
// ============================================================================

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// ============================================================================
// CLASSIFICATION SCHEMA
// ============================================================================

/**
 * Schema for OpenAI structured output. All fields required (no optionals)
 * for strict mode compatibility.
 */
export const KaruteClassificationSchema = z.object({
  summary: z.string(),
  entries: z.array(
    z.object({
      category: z.enum([
        'SYMPTOM',
        'TREATMENT',
        'BODY_AREA',
        'PREFERENCE',
        'LIFESTYLE',
        'NEXT_VISIT',
        'OTHER',
      ]),
      content: z.string(),
      confidence: z.number(),
      originalQuote: z.string(),
      segmentIndices: z.array(z.number()),
    })
  ),
});

export type ClassificationResult = z.infer<typeof KaruteClassificationSchema>;

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const CLASSIFICATION_SYSTEM_PROMPT = `あなたは日本の整体・マッサージ院の施術記録アシスタントです。
施術中の会話記録を分析し、カルテ（施術記録）のエントリに分類してください。

カテゴリ:
- SYMPTOM: 患者の症状、痛み、不調
- TREATMENT: 施術内容、手技
- BODY_AREA: 施術部位
- PREFERENCE: 患者の好み（圧の強さなど）
- LIFESTYLE: 生活習慣、運動、食事
- NEXT_VISIT: 次回予約、フォローアップ
- OTHER: その他の重要な情報

各エントリに0-1の信頼度スコアを付けてください。
sessionのサマリーも日本語で生成してください。
originalQuoteは元の会話テキストをそのまま引用してください。
segmentIndicesは参照元のセグメント番号の配列です。`;

// ============================================================================
// CLASSIFICATION
// ============================================================================

/**
 * Classifies transcription segments for a karute record into structured
 * entries using OpenAI gpt-4o and stores the results.
 *
 * 1. Fetches karute record with its recording sessions' transcription segments
 * 2. Formats transcript for OpenAI
 * 3. Calls OpenAI with structured output schema
 * 4. Stores entries and summary in a transaction
 */
export async function classifyAndStoreEntries(
  karuteRecordId: string
): Promise<{ success: true; entryCount: number } | { success: false; error: string }> {
  try {
    // 1. Fetch karute record with transcription segments
    const record = await prisma.karuteRecord.findUnique({
      where: { id: karuteRecordId },
      include: {
        recordingSessions: {
          include: {
            segments: { orderBy: { segmentIndex: 'asc' } },
          },
        },
      },
    });

    if (!record) {
      return { success: false, error: 'Karute record not found' };
    }

    // Collect all segments from all recording sessions
    const allSegments = record.recordingSessions.flatMap((s) => s.segments);

    if (allSegments.length === 0) {
      return { success: false, error: 'No transcription segments found' };
    }

    // 2. Format transcript
    const transcript = allSegments
      .map(
        (s) =>
          `[Segment ${s.segmentIndex}] [${s.speakerLabel || '?'}] ${s.content}`
      )
      .join('\n');

    // 3. Call OpenAI with structured output
    const jsonSchema = z.toJSONSchema(KaruteClassificationSchema, {
      target: 'draft-7',
    });

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'karute_classification',
          strict: true,
          schema: jsonSchema,
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'Empty classification response' };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { success: false, error: 'Invalid JSON in classification response' };
    }

    const classification = KaruteClassificationSchema.parse(parsed);

    // 4. Store in transaction: update summary + create entries
    await prisma.$transaction(async (tx) => {
      await tx.karuteRecord.update({
        where: { id: karuteRecordId },
        data: { aiSummary: classification.summary },
      });

      await tx.karuteEntry.createMany({
        data: classification.entries.map((entry, index) => ({
          karuteId: karuteRecordId,
          category: entry.category,
          content: entry.content,
          confidence: entry.confidence,
          originalQuote: entry.originalQuote,
          segmentIndices: entry.segmentIndices,
          displayOrder: index,
        })),
      });
    });

    return { success: true, entryCount: classification.entries.length };
  } catch (error) {
    Sentry.captureException(error);
    console.error('[classification.service] Classification failed', {
      error,
      karuteRecordId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Classification failed',
    };
  }
}
