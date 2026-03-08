# Phase 5: AI Classification & Karute UI - Research

**Researched:** 2026-03-07
**Domain:** OpenAI structured outputs for transcript classification, karute CRUD UI, approval workflow, PDF export
**Confidence:** HIGH

## Summary

Phase 5 takes the transcription segments stored by Phase 4 and uses OpenAI's structured outputs to classify them into karute entries (SYMPTOM, TREATMENT, BODY_AREA, PREFERENCE, LIFESTYLE, NEXT_VISIT, OTHER) with confidence scores, generates a session summary, and provides a complete editing/approval UI. The AI classification is a server-side service that sends the full transcript to OpenAI with a JSON schema specifying the exact output structure. The UI is a side-by-side layout with transcript on one side and entry cards on the other, with inline editing, status workflow, and export.

Phase 3 already built all the data layer: Prisma models (KaruteRecord, KaruteEntry with KaruteEntryCategory enum, KaruteStatus enum), karute.service.ts with full CRUD, server actions with admin auth, and Zod validation schemas. Phase 4 added the transcription pipeline (TranscriptionSegment model, transcription.service.ts). Phase 5's job is: (1) build the AI classification service, (2) build the karute UI components, (3) add approval workflow, (4) add karute history to customer detail page, and (5) add PDF/text export.

**Critical finding:** The project uses Zod v4 (^4.3.6), but OpenAI's `zodResponseFormat` helper does NOT support Zod v4. Use `z.toJSONSchema()` (Zod v4's built-in JSON schema conversion) to manually construct the `response_format` object instead.

**Primary recommendation:** Use OpenAI `gpt-4o` with structured outputs (manual JSON schema via `z.toJSONSchema()`) for classification, `@react-pdf/renderer` for server-side PDF generation, and SWR-powered client components following the existing customer-detail.tsx pattern for the karute UI.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Fully automatic classification -- AI processes entire transcript at once, generates all entries. Staff reviews/edits after.
- Low-confidence entries flagged visually with a warning badge. Staff decides the correct category.
- AI auto-generates a brief narrative summary for each karute record alongside structured entries.
- Tags are optional extra metadata staff can add to entries (e.g., 'chronic', 'first-time', 'follow-up') -- separate from the fixed category enum (SYMPTOM, TREATMENT, etc.)
- Card-based list -- each entry is a card with category badge, content, confidence score
- Inline editing -- click entry text to edit in-place, category changeable via dropdown
- Staff can manually add new entries the AI missed (pick category, type content, optionally link to transcript)
- Side-by-side layout -- transcript on one side, entries on the other. Click entry to highlight source in transcript.
- Three-step workflow: Draft -> Review -> Approved
- Any logged-in admin/staff can approve (no role restriction)
- Approved records remain always editable (approval is a status marker, not a lock)
- Color-coded status badges: Draft=gray, Review=yellow, Approved=green
- Per-customer karute history displayed as chronological timeline (most recent first)
- Each record in list shows: date, practitioner, status badge (minimal -- click to see details)
- Export as formatted text/PDF -- clean document with summary, entries by category, practitioner info
- History accessible as a tab in the existing customer detail page (CRM integration)

### Claude's Discretion
- Exact card component styling and spacing
- AI prompt engineering for classification and summary generation
- PDF generation approach (server-side vs client-side)
- Loading states and skeleton UI
- Transcript highlight interaction details

### Deferred Ideas (OUT OF SCOPE)
- Version history for karute records (edit creates new version) -- could be added later for audit trails
- Role-based approval restrictions (only certain staff can approve) -- not needed for single-shop MVP
- CSV export for data analysis -- PDF is enough for now, CSV can be added later
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openai | ^4.x (already installed from Phase 4) | OpenAI API client for classification | Official SDK, TypeScript-first, structured outputs support |
| @react-pdf/renderer | ^4.x | Server-side PDF generation | React component API, works in Node.js, clean document structure |

### Already Installed (from Phase 3/4)
| Library | Version | Purpose |
|---------|---------|---------|
| swr | ^2.4.0 | Data fetching for karute records and entries |
| zod | ^4.3.6 | Validation schemas (karute.ts already has schemas) |
| @prisma/client | ^6.19.2 | Database access (KaruteRecord, KaruteEntry models exist) |
| next-intl | ^4.8.2 | i18n for Japanese/English UI strings |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @react-pdf/renderer | jsPDF | jsPDF is client-side only, less suitable for server-side generation. @react-pdf/renderer uses React components for PDF layout, natural fit for this stack. |
| Manual JSON schema | zodResponseFormat | zodResponseFormat does NOT work with Zod v4 (project uses ^4.3.6). Must use z.toJSONSchema() instead. |
| gpt-4o structured outputs | Function calling | Structured outputs via response_format is simpler for this use case (single classification response, not tool use). |

**Installation:**
```bash
npm install @react-pdf/renderer
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    services/
      classification.service.ts   # AI classification: transcript -> entries + summary
      karute.service.ts            # Already exists (Phase 3): CRUD operations
      karute-export.service.ts     # PDF/text export generation
    validations/
      karute.ts                    # Already exists (Phase 3): extend with classification schema
  components/
    karute/
      KaruteEditor.tsx             # Main side-by-side layout (transcript + entries)
      EntryCard.tsx                # Individual entry card with badge, content, confidence
      EntryForm.tsx                # Inline edit form / new entry form
      TranscriptPanel.tsx          # Transcript display with highlight support
      StatusBadge.tsx              # Color-coded Draft/Review/Approved badge
      ConfidenceBadge.tsx          # Low-confidence warning indicator
      KaruteHistory.tsx            # Timeline list for customer detail page
      KaruteHistoryItem.tsx        # Single record in timeline
      ApprovalControls.tsx         # Status transition buttons

app/
  actions/
    karute.ts                      # Already exists: extend with classify + status actions
  api/
    admin/
      karute/
        [id]/
          classify/route.ts        # POST: trigger AI classification for a record
          export/route.ts          # GET: generate and return PDF/text export
  [locale]/
    (admin)/
      admin/
        karute/
          [id]/
            page.tsx               # Karute editor page (side-by-side view)
        customers/
          [id]/
            karute-tab.tsx         # Karute history tab in customer detail
```

### Pattern 1: AI Classification with Structured Outputs (Zod v4 Compatible)
**What:** Send full transcript to OpenAI, get back typed classification result
**When to use:** After transcription completes, to generate karute entries
**Example:**
```typescript
// src/lib/services/classification.service.ts
// CRITICAL: Cannot use zodResponseFormat with Zod v4
// Use z.toJSONSchema() instead

import OpenAI from 'openai';
import { z } from 'zod';

const ClassificationResultSchema = z.object({
  summary: z.string().describe('Brief narrative summary of the treatment session in Japanese'),
  entries: z.array(z.object({
    category: z.enum([
      'SYMPTOM', 'TREATMENT', 'BODY_AREA',
      'PREFERENCE', 'LIFESTYLE', 'NEXT_VISIT', 'OTHER'
    ]),
    content: z.string().describe('The classified content in Japanese'),
    confidence: z.number().min(0).max(1).describe('Confidence score 0-1'),
    originalQuote: z.string().describe('The exact quote from the transcript'),
    segmentIndices: z.array(z.number()).describe('Indices of source transcript segments'),
  })),
});

type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

export async function classifyTranscript(
  transcriptSegments: { content: string; speakerLabel: string | null; segmentIndex: number }[]
): Promise<ClassificationResult> {
  const transcript = transcriptSegments
    .map(s => `[${s.speakerLabel || '?'}] ${s.content}`)
    .join('\n');

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a medical record assistant for a Japanese wellness clinic (seitai/massage).
Classify the following treatment session transcript into structured entries.
Each entry should have a category, the classified content, a confidence score, and the original quote.
Also generate a brief narrative summary of the session.
Respond in Japanese.`,
      },
      { role: 'user', content: transcript },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'classification_result',
        strict: true,
        schema: z.toJSONSchema(ClassificationResultSchema, { target: 'draft-7' }),
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No classification response');

  return JSON.parse(content) as ClassificationResult;
}
```

### Pattern 2: Karute Editor Side-by-Side Layout
**What:** Split-panel layout with transcript on left, entry cards on right
**When to use:** Main karute editing view
**Example:**
```typescript
// Following existing customer-detail.tsx pattern (SWR + client component)
'use client';

export function KaruteEditor({ recordId }: { recordId: string }) {
  const { data, mutate } = useSWR(`/api/admin/karute/${recordId}`, fetcher);
  const [activeSegmentIndices, setActiveSegmentIndices] = useState<number[]>([]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left: Transcript */}
      <TranscriptPanel
        segments={data?.segments ?? []}
        highlightedIndices={activeSegmentIndices}
      />
      {/* Right: Entry Cards */}
      <div className="space-y-3">
        <ApprovalControls status={data?.status} recordId={recordId} onUpdate={mutate} />
        {data?.entries.map(entry => (
          <EntryCard
            key={entry.id}
            entry={entry}
            onHover={() => setActiveSegmentIndices(entry.segmentIndices)}
            onUpdate={mutate}
          />
        ))}
        <AddEntryButton recordId={recordId} onAdd={mutate} />
      </div>
    </div>
  );
}
```

### Pattern 3: Server Action Pattern (following admin-booking.ts)
**What:** Server actions with admin auth guard, revalidatePath, error handling
**When to use:** All karute mutations (update status, edit entries, delete entries)
**Example:**
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { getAdminSession } from '@/lib/auth/admin';
import { updateKaruteRecord } from '@/lib/services/karute.service';

export async function updateKaruteStatusAction(recordId: string, status: 'DRAFT' | 'REVIEW' | 'APPROVED') {
  const isAdmin = await getAdminSession();
  if (!isAdmin) throw new Error('Unauthorized');

  const result = await updateKaruteRecord(recordId, { status });
  if (!result.success) throw new Error(result.error);

  revalidatePath(`/admin/karute/${recordId}`);
  return { success: true };
}
```

### Pattern 4: PDF Export with @react-pdf/renderer
**What:** Server-side PDF generation using React components
**When to use:** Karute export endpoint
**Example:**
```typescript
// src/lib/services/karute-export.service.ts
import { renderToBuffer } from '@react-pdf/renderer';
import { KaruteDocument } from '@/components/karute/KaruteDocument';

export async function generateKarutePDF(recordId: string): Promise<Buffer> {
  const record = await getKaruteRecordWithEntries(recordId);
  const buffer = await renderToBuffer(<KaruteDocument record={record} />);
  return buffer;
}
```

### Anti-Patterns to Avoid
- **Using zodResponseFormat with Zod v4:** Will fail at runtime. Use `z.toJSONSchema()` with manual `response_format` construction instead.
- **Module-level OpenAI instantiation:** Per Phase 4 decision (04-02), use lazy client creation to avoid build/test failures when OPENAI_API_KEY is not set.
- **Client-side AI calls:** Never expose OPENAI_API_KEY to the browser. Classification must be server-side only.
- **Locking records on approval:** Per user decision, approved records remain always editable. Do NOT add conditional editing logic based on status.
- **Over-engineering the approval workflow:** This is a simple status field update, not a state machine with guards. Any admin can set any status.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Transcript classification | Custom NLP parsing, regex extraction | OpenAI gpt-4o with structured outputs | Handles Japanese, understands medical context, structured JSON output guaranteed |
| PDF generation | Manual PDF byte construction, HTML-to-PDF | @react-pdf/renderer | React component API, proper CJK (Japanese) font support, server-side rendering |
| JSON schema from Zod | Manual JSON schema writing | `z.toJSONSchema(schema, { target: 'draft-7' })` | Zod v4 built-in, keeps schema in sync with TypeScript types |
| Confidence thresholds | Complex scoring algorithms | Simple 0-1 float from OpenAI + UI threshold (e.g., < 0.7 = warning) | AI provides calibrated confidence; display logic is just a comparison |
| Karute CRUD | New service layer | Existing karute.service.ts from Phase 3 | Already built with Result<T> pattern, Zod validation, Sentry integration |

**Key insight:** Phase 3 already built the entire data layer (models, service, actions, validations). Phase 5 adds the AI classification service and the UI layer. Do not rebuild what exists.

## Common Pitfalls

### Pitfall 1: Zod v4 + zodResponseFormat Incompatibility
**What goes wrong:** `zodResponseFormat` from `openai/helpers/zod` throws runtime errors with Zod v4
**Why it happens:** OpenAI SDK's internal `zod-to-json-schema` dependency does not support Zod v4's changed `ZodFirstPartyTypeKind` export
**How to avoid:** Use `z.toJSONSchema(schema, { target: 'draft-7' })` and construct the `response_format` object manually. This is officially supported and works with Zod v4.
**Warning signs:** Import errors mentioning `ZodFirstPartyTypeKind`, runtime crashes when calling `zodResponseFormat`

### Pitfall 2: OpenAI Structured Output Schema Restrictions
**What goes wrong:** API rejects schema with unsupported JSON Schema features
**Why it happens:** OpenAI only supports a subset of JSON Schema in strict mode. Optional fields, union types, and some patterns may not work.
**How to avoid:** Keep the classification schema simple. All fields required. Use `z.enum()` for categories. Avoid nullable/optional fields in the schema sent to OpenAI (handle defaults in post-processing).
**Warning signs:** API error "Invalid schema" or "Unsupported JSON Schema feature"

### Pitfall 3: First Request Latency with New Schema
**What goes wrong:** First classification request takes 10-60 seconds longer than subsequent ones
**Why it happens:** OpenAI processes and caches the JSON schema on first use
**How to avoid:** Accept the latency on first request. Show a loading state. Subsequent requests will be fast. Do NOT retry on timeout -- let it complete.
**Warning signs:** First classification seems "stuck" but works fine on retry

### Pitfall 4: Japanese Font Rendering in PDF
**What goes wrong:** PDF shows boxes or question marks instead of Japanese characters
**Why it happens:** Default PDF fonts do not include CJK glyphs
**How to avoid:** Register a Japanese font (e.g., Noto Sans JP) with `@react-pdf/renderer`'s `Font.register()`. Bundle the font file or load from CDN.
**Warning signs:** PDF renders correctly in English but garbled for Japanese content

### Pitfall 5: Transcript Highlight Scroll Sync
**What goes wrong:** Clicking an entry card does not reliably scroll to the corresponding transcript segment
**Why it happens:** Dynamic content heights, race conditions with SWR refetches, ref timing
**How to avoid:** Use `scrollIntoView({ behavior: 'smooth', block: 'center' })` with stable element IDs based on segment index. Attach refs after data loads, not during initial render.
**Warning signs:** Scroll works on second click but not first, or scrolls to wrong position

### Pitfall 6: Inline Editing State Conflicts
**What goes wrong:** Editing an entry card while SWR refetches causes the edit to be lost
**Why it happens:** SWR `mutate()` replaces local state with server data during an active edit
**How to avoid:** Track which entry is being edited in local state. Skip SWR revalidation while editing (use `useSWR` with `revalidateOnFocus: false`), or use optimistic updates with `mutate(data, false)`.
**Warning signs:** User types text, it disappears, previous value reappears

### Pitfall 7: Large Transcript Token Limits
**What goes wrong:** Classification fails because the transcript exceeds the model's context window
**Why it happens:** A 60-minute session transcript can be very long (thousands of tokens in Japanese)
**How to avoid:** gpt-4o has a 128K context window, which should handle most sessions. For safety, truncate to a reasonable limit (e.g., first 100K tokens) and warn if exceeded. Japanese text is roughly 1-2 tokens per character.
**Warning signs:** API error about context length exceeded

## Code Examples

### Classification Service with Error Handling
```typescript
// src/lib/services/classification.service.ts
import OpenAI from 'openai';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import * as Sentry from '@sentry/nextjs';

// Lazy OpenAI client (per 04-02 decision)
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Schema for structured output
const KaruteClassificationSchema = z.object({
  summary: z.string(),
  entries: z.array(z.object({
    category: z.enum([
      'SYMPTOM', 'TREATMENT', 'BODY_AREA',
      'PREFERENCE', 'LIFESTYLE', 'NEXT_VISIT', 'OTHER',
    ]),
    content: z.string(),
    confidence: z.number(),
    originalQuote: z.string(),
    segmentIndices: z.array(z.number()),
  })),
});

export type ClassificationResult = z.infer<typeof KaruteClassificationSchema>;

export async function classifyAndStoreEntries(
  karuteRecordId: string
): Promise<{ success: true; entryCount: number } | { success: false; error: string }> {
  try {
    // 1. Get the karute record with its recording's transcription segments
    const record = await prisma.karuteRecord.findUnique({
      where: { id: karuteRecordId },
      include: {
        recordingSession: {
          include: {
            segments: { orderBy: { segmentIndex: 'asc' } },
          },
        },
      },
    });

    if (!record?.recordingSession?.segments?.length) {
      return { success: false, error: 'No transcription segments found' };
    }

    const segments = record.recordingSession.segments;

    // 2. Call OpenAI classification
    const transcript = segments
      .map(s => `[Segment ${s.segmentIndex}] [${s.speakerLabel || '?'}] ${s.content}`)
      .join('\n');

    const jsonSchema = z.toJSONSchema(KaruteClassificationSchema, { target: 'draft-7' });

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは日本の整体・マッサージ院の施術記録アシスタントです。
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
segmentIndicesは参照元のセグメント番号の配列です。`,
        },
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

    const classification = KaruteClassificationSchema.parse(JSON.parse(content));

    // 3. Store entries and update summary in a transaction
    await prisma.$transaction(async (tx) => {
      // Update record summary
      await tx.karuteRecord.update({
        where: { id: karuteRecordId },
        data: { summary: classification.summary },
      });

      // Create entries
      await tx.karuteEntry.createMany({
        data: classification.entries.map((entry, index) => ({
          karuteRecordId,
          category: entry.category,
          content: entry.content,
          confidence: entry.confidence,
          originalQuote: entry.originalQuote,
          displayOrder: index,
        })),
      });
    });

    return { success: true, entryCount: classification.entries.length };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Classification failed',
    };
  }
}
```

### Status Badge Component
```typescript
// src/components/karute/StatusBadge.tsx
const statusConfig = {
  DRAFT: { label: '下書き', labelEn: 'Draft', className: 'bg-gray-100 text-gray-700' },
  REVIEW: { label: '確認中', labelEn: 'Review', className: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: '承認済', labelEn: 'Approved', className: 'bg-green-100 text-green-700' },
} as const;

export function StatusBadge({ status, locale }: { status: string; locale: string }) {
  const config = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.DRAFT;
  const label = locale === 'ja' ? config.label : config.labelEn;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>
      {label}
    </span>
  );
}
```

### PDF Document Component
```typescript
// src/components/karute/KaruteDocument.tsx
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register Japanese font
Font.register({
  family: 'NotoSansJP',
  src: 'https://fonts.gstatic.com/s/notosansjp/v53/...',
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'NotoSansJP', fontSize: 10 },
  title: { fontSize: 16, marginBottom: 10 },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 5 },
  entry: { marginBottom: 5, paddingLeft: 10 },
  // ...
});

export function KaruteDocument({ record }: { record: KaruteRecordWithEntries }) {
  const entriesByCategory = groupBy(record.entries, 'category');
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>施術記録 / Treatment Record</Text>
        {/* Header: date, practitioner, customer, status */}
        <View style={styles.section}>
          <Text>日付: {formatDate(record.createdAt)}</Text>
          <Text>施術者: {record.worker.name}</Text>
          <Text>患者: {record.customer.name}</Text>
        </View>
        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>サマリー</Text>
          <Text>{record.summary}</Text>
        </View>
        {/* Entries grouped by category */}
        {Object.entries(entriesByCategory).map(([category, entries]) => (
          <View key={category} style={styles.section}>
            <Text style={styles.sectionTitle}>{categoryLabel(category)}</Text>
            {entries.map(entry => (
              <Text key={entry.id} style={styles.entry}>- {entry.content}</Text>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| zodResponseFormat helper | Manual z.toJSONSchema() + response_format | Zod v4 release (2025) | Must construct response_format manually; zodResponseFormat is Zod v3 only |
| Chat Completions API | Responses API (newer) | 2025 | Chat Completions still fully supported; no need to migrate for this use case |
| whisper-1 for transcription | gpt-4o-transcribe-diarize | Late 2024 | Phase 4 already uses the newer model; classification builds on its output |

**Deprecated/outdated:**
- `zodResponseFormat` from `openai/helpers/zod`: Does not work with Zod v4. Use manual JSON schema construction.

## Data Layer Reference (From Phase 3)

Phase 3 already created these assets that Phase 5 directly uses:

| Asset | Location | What Phase 5 Uses |
|-------|----------|-------------------|
| KaruteRecord model | prisma/schema.prisma | status (KaruteStatus enum), summary field, customerId, workerId, bookingId relations |
| KaruteEntry model | prisma/schema.prisma | category (KaruteEntryCategory enum), content, confidence (Float), originalQuote, displayOrder |
| KaruteStatus enum | prisma/schema.prisma | DRAFT, REVIEW, APPROVED |
| KaruteEntryCategory enum | prisma/schema.prisma | SYMPTOM, TREATMENT, BODY_AREA, PREFERENCE, LIFESTYLE, NEXT_VISIT, OTHER |
| karute.service.ts | src/lib/services/ | createKaruteRecord, getKaruteRecord, getKaruteRecordsByCustomer, updateKaruteRecord, deleteKaruteRecord, createKaruteEntry, updateKaruteEntry, deleteKaruteEntry |
| Server actions | app/actions/karute.ts | 9 actions with admin auth: create/update/delete for records and entries |
| Zod schemas | src/lib/validations/karute.ts | createKaruteEntrySchema, updateKaruteEntrySchema, etc. |
| RecordingSession model | prisma/schema.prisma | audioStoragePath, durationSeconds, status |
| TranscriptionSegment model | prisma/schema.prisma | segmentIndex, speakerLabel, content, startMs, endMs |

## Schema Extensions Needed

Phase 5 may need minor schema additions not covered by Phase 3:

| Addition | Location | Purpose |
|----------|----------|---------|
| `tags` field on KaruteEntry | prisma/schema.prisma | Optional string array for extra metadata (e.g., 'chronic', 'first-time') |
| Segment index linkage on KaruteEntry | prisma/schema.prisma | Array of segment indices linking entry to source transcript (if not already in originalQuote) |

Check the actual schema on the Phase 3/4 branch before adding -- these may already exist.

## Open Questions

1. **Exact KaruteEntry schema fields**
   - What we know: Phase 3 verification confirms fields exist (category, content, confidence, originalQuote, displayOrder)
   - What's unclear: Whether `tags` (String[]) and `segmentIndices` (Int[]) already exist from Phase 3, or need to be added
   - Recommendation: Check the schema on the integration branch. If not present, add via Prisma migration in first task.

2. **z.toJSONSchema() strict mode compatibility**
   - What we know: `z.toJSONSchema()` with `{ target: 'draft-7' }` produces valid JSON Schema. OpenAI requires `strict: true` which limits supported features.
   - What's unclear: Whether all Zod v4 types used in classification schema produce OpenAI-compatible JSON Schema
   - Recommendation: Test the schema conversion early. Keep classification schema simple (no unions, no optional fields, no defaults).

3. **Japanese font for @react-pdf/renderer**
   - What we know: Need to register a CJK font. Noto Sans JP from Google Fonts is the standard choice.
   - What's unclear: Whether to bundle the font file locally or load from CDN. Bundle adds to deployment size; CDN adds network dependency.
   - Recommendation: Bundle a subset of Noto Sans JP (regular + bold weights only, ~2-4MB total) in the project. More reliable than CDN for server-side rendering.

## Sources

### Primary (HIGH confidence)
- Existing codebase: karute.service.ts, customer-detail.tsx, admin-booking.ts patterns
- Phase 3 Verification Report: Confirmed all karute models, service, actions exist and pass tests
- Phase 4 Research: Confirmed OpenAI SDK installed, transcription pipeline, lazy client pattern
- [OpenAI Structured Outputs Guide](https://developers.openai.com/api/docs/guides/structured-outputs/) -- response_format with json_schema

### Secondary (MEDIUM confidence)
- [OpenAI Node SDK Issue #1540](https://github.com/openai/openai-node/issues/1540) -- Zod v4 workaround using z.toJSONSchema()
- [npm-compare: jspdf vs @react-pdf/renderer](https://npm-compare.com/@react-pdf/renderer,jspdf,pdfmake,react-pdf) -- PDF library comparison
- [@react-pdf/renderer npm](https://www.npmjs.com/package/@react-pdf/renderer) -- Server-side rendering support confirmed

### Tertiary (LOW confidence)
- z.toJSONSchema() output compatibility with OpenAI strict mode -- needs validation during implementation
- @react-pdf/renderer CJK font rendering -- confirmed conceptually but not tested with this specific project

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- OpenAI SDK already installed, @react-pdf/renderer is well-established
- Architecture: HIGH -- Follows existing codebase patterns exactly (services, actions, SWR components)
- AI Classification: MEDIUM -- Zod v4 JSON schema workaround is documented but not yet tested in this project
- PDF Export: MEDIUM -- @react-pdf/renderer supports server-side and CJK, but Japanese font setup needs testing
- Pitfalls: HIGH -- Zod v4 incompatibility is well-documented; inline editing state management is a known React pattern

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (30 days -- OpenAI API is stable, Zod v4 workaround is settled)
