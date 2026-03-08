# Architecture Patterns: SYNQ Karte (AI Electronic Medical Records)

**Domain:** AI-powered Karte (medical record) system with live transcription, integrated into existing Next.js 15 booking app
**Researched:** 2026-03-07
**Confidence:** MEDIUM (existing codebase analysis + WebSearch patterns for streaming/transcription APIs)

## Executive Summary

The Karte feature adds three new capabilities to SYNQ: (1) audio recording of appointments, (2) live transcription with AI, and (3) structured karte generation from transcripts. These features layer on top of the existing Booking/Customer/Worker models and require new data models, streaming API routes, audio storage, and an AI provider abstraction.

The architecture follows the existing SYNQ patterns -- route groups, Prisma services, Supabase Storage, admin auth via JWT -- while introducing SSE-based streaming for live transcription and a provider-agnostic AI layer. Audio recording happens client-side via the MediaRecorder API, with chunked uploads to the server for both storage and real-time transcription.

## Recommended Architecture

### High-Level System Diagram

```
+-------------------------------------------------------------------+
|                    Next.js 15 App Router                            |
+-------------------------------------------------------------------+
|                                                                     |
|  EXISTING                          NEW                              |
|  /(admin)/admin/dashboard          /(admin)/admin/appointment/[id]  |
|    - Timetable (tab nav)             - Recording controls           |
|    - New: "Karte" column/link        - Live transcript viewer       |
|    - New: Today's appointments       - Karte editor/viewer          |
|      with karte status               - Past karte history           |
|                                                                     |
+----------------------------+----------------------------------------+
                             |
        +--------------------+--------------------+
        |                    |                    |
  Server Actions       API Routes (new)     API Routes (existing)
  (mutations)          /api/karte/*          /api/admin/*
                       /api/transcription/*
        |                    |                    |
        +--------------------+--------------------+
                             |
              +--------------+--------------+
              |              |              |
        Service Layer   AI Provider    Supabase Storage
        (Prisma)        Abstraction    (audio bucket)
              |              |
              |         +----+----+
              |         |         |
              |     OpenAI    (future:
              |     API       Deepgram,
              |               Google, etc)
              |
        PostgreSQL (Supabase)
```

### Component Boundaries

| Component | Responsibility | Communicates With | New/Modified |
|-----------|---------------|-------------------|-------------|
| **Appointment Page** | Recording UI, transcript display, karte viewer | API routes (SSE + REST), server actions | NEW |
| **Recording Controls** | Start/stop/pause audio, MediaRecorder management, chunk upload | `/api/transcription/stream` | NEW |
| **Transcript Viewer** | Display live + completed transcripts, speaker labels | SSE connection to transcription API | NEW |
| **Karte Editor** | View/edit AI-generated structured karte | Server actions for save/update | NEW |
| **Dashboard Karte Column** | Show karte status per booking on timetable | Existing calendar API (extended) | MODIFIED |
| **Transcription API Route** | Receive audio chunks, forward to AI, stream results | AI Provider, Supabase Storage | NEW |
| **Karte Generation API** | Generate structured karte from transcript | AI Provider, Prisma | NEW |
| **AI Provider Abstraction** | Normalize interface across transcription/generation providers | OpenAI SDK (initially) | NEW |
| **Audio Storage Service** | Upload/retrieve/delete audio files | Supabase Storage (`karte-audio` bucket) | NEW |
| **Karte Service** | CRUD for Karte, Recording, Transcription models | Prisma Client | NEW |

## New Prisma Models

### Schema Extension

```prisma
// ============================================================================
// KARTE ENUMS
// ============================================================================

enum KarteStatus {
  DRAFT        // AI-generated, not yet reviewed
  REVIEWED     // Practitioner has reviewed
  FINALIZED    // Locked, no further edits
}

enum RecordingStatus {
  RECORDING    // Currently being recorded
  PROCESSING   // Upload/transcription in progress
  COMPLETED    // Done
  FAILED       // Error during processing
}

enum TranscriptionStatus {
  PENDING      // Waiting to be processed
  IN_PROGRESS  // Currently transcribing
  COMPLETED    // Done
  FAILED       // Error
}

// ============================================================================
// KARTE MODELS
// ============================================================================

model Karte {
  id              String        @id @default(uuid())
  bookingId       String        @unique  // 1:1 with Booking
  customerId      String
  workerId        String        // Practitioner who created it
  status          KarteStatus   @default(DRAFT)

  // AI-generated structured content (JSON)
  // Contains: chiefComplaint, subjective, objective, assessment, plan
  content         Json?

  // Free-form practitioner notes (supplements AI content)
  notes           String?

  // AI-generated tags for searchability
  tags            String[]      @default([])

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  customer        Customer      @relation(fields: [customerId], references: [id])
  worker          Worker        @relation(fields: [workerId], references: [id])
  recording       Recording?
  transcription   Transcription?

  @@index([customerId])
  @@index([workerId])
  @@index([createdAt])
}

model Recording {
  id              String          @id @default(uuid())
  karteId         String          @unique  // 1:1 with Karte
  status          RecordingStatus @default(RECORDING)

  // Supabase Storage path (karte-audio bucket)
  audioPath       String?
  durationSeconds Int?
  mimeType        String          @default("audio/webm")
  fileSizeBytes   Int?

  startedAt       DateTime        @default(now())
  completedAt     DateTime?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  // Relations
  karte           Karte           @relation(fields: [karteId], references: [id], onDelete: Cascade)

  @@index([karteId])
}

model Transcription {
  id              String              @id @default(uuid())
  karteId         String              @unique  // 1:1 with Karte
  status          TranscriptionStatus @default(PENDING)

  // Full transcript text
  fullText        String?

  // Structured segments with timestamps and speaker labels (JSON array)
  // [{speaker: "practitioner"|"patient", start: 0.0, end: 5.2, text: "..."}]
  segments        Json?

  // Source language detected
  language        String?             @default("ja")

  // Translation (if requested)
  translatedText  String?
  translatedLang  String?

  // AI model used
  model           String?
  processingTime  Int?                // milliseconds

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  // Relations
  karte           Karte               @relation(fields: [karteId], references: [id], onDelete: Cascade)

  @@index([karteId])
}
```

### Relation to Existing Models

```
Booking (existing)
  |-- 1:1 --> Karte (new)
                |-- 1:1 --> Recording (new)
                |-- 1:1 --> Transcription (new)

Customer (existing)
  |-- 1:many --> Karte (new, via customerId)
  |-- 1:many --> MedicalRecord (existing, intake forms)

Worker (existing)
  |-- 1:many --> Karte (new, via workerId)
```

Add to existing models:

```prisma
// Add to Customer model:
kartes          Karte[]

// Add to Worker model:
kartes          Karte[]

// Note: Booking does NOT get a relation field added.
// Karte references bookingId but Booking schema stays unchanged.
// This avoids modifying the core booking flow.
// Query karte from booking: prisma.karte.findUnique({ where: { bookingId } })
```

**Design Decision:** Karte has `bookingId @unique` for a clean 1:1 relationship, but the relation is defined one-directionally from Karte to avoid touching the Booking model. This keeps the existing booking flow untouched and migration-safe.

## Route Structure

### New Routes

```
app/
  [locale]/
    (admin)/
      admin/
        appointment/
          [id]/
            page.tsx          # Main appointment karte page
            layout.tsx        # Appointment-specific layout
        dashboard/
          page.tsx            # MODIFIED: add karte status indicators
  api/
    karte/
      [bookingId]/
        route.ts              # GET karte, PUT update karte
      [bookingId]/
        generate/
          route.ts            # POST: trigger AI karte generation (SSE)
    transcription/
      stream/
        route.ts              # POST: receive audio chunk, return transcript delta (SSE)
      [karteId]/
        route.ts              # GET full transcription, PUT manual edits
    recording/
      upload/
        route.ts              # POST: upload audio chunk to Supabase Storage
      [karteId]/
        route.ts              # GET recording metadata, DELETE recording
```

**Why extend (admin) route group, not create new:** The appointment page is an admin-only feature (practitioners use it). It shares the admin auth middleware, layout patterns, and styling. A new route group would duplicate auth logic for no benefit.

**Why `/admin/appointment/[id]` not `/admin/karte/[id]`:** The URL represents what the practitioner navigates to -- they go to an appointment, which happens to contain a karte. The appointment ID (booking ID) is the natural navigation key from the dashboard timetable.

## Data Flows

### Flow 1: Start Recording and Live Transcription

```
Practitioner clicks "Start Recording"
         |
         v
[Browser: MediaRecorder API]
  - getUserMedia({ audio: true })
  - new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
  - mediaRecorder.start(5000)  // 5-second chunks
         |
         v
[On dataavailable event every 5s]
  - Collect audio Blob chunk
  - POST /api/recording/upload (FormData with chunk + karteId + chunkIndex)
  - Simultaneously: POST /api/transcription/stream (FormData with audio chunk)
         |                                    |
         v                                    v
[API: /api/recording/upload]         [API: /api/transcription/stream]
  - Append to temp file or             - Forward chunk to OpenAI
    upload chunk to Supabase              gpt-4o-mini-transcribe
  - Return { success: true }            - Return SSE stream:
                                           data: {"delta": "...", "segment": {...}}
                                           data: {"delta": "...", "segment": {...}}
         |                                    |
         v                                    v
[Supabase Storage]                   [Browser: EventSource / fetch + reader]
  karte-audio/{karteId}/               - Append transcript text to display
    chunk-000.webm                     - Update segments array
    chunk-001.webm                     - Show live text to practitioner
    ...
```

### Flow 2: Stop Recording and Finalize

```
Practitioner clicks "Stop Recording"
         |
         v
[Browser]
  - mediaRecorder.stop()
  - Upload final chunk
  - POST /api/recording/upload/finalize
         |
         v
[API: finalize]
  - Concatenate chunks in Supabase Storage (or keep as multi-part)
  - Update Recording: status=COMPLETED, durationSeconds, fileSizeBytes
  - Update Transcription: status=COMPLETED, fullText (accumulated)
  - Return { recordingId, transcriptionId }
         |
         v
[Browser: Auto-trigger karte generation]
  - POST /api/karte/{bookingId}/generate (SSE)
         |
         v
[API: generate karte]
  - Load full transcription text
  - Send to OpenAI with structured prompt
  - Stream structured JSON response via SSE:
      data: {"field": "chiefComplaint", "delta": "..."}
      data: {"field": "subjective", "delta": "..."}
      ...
      data: {"done": true, "karte": {...}}
  - Save completed Karte to DB
         |
         v
[Browser: Karte Editor]
  - Display AI-generated content field by field
  - Practitioner can edit, add notes
  - Save via server action (updateKarte)
```

### Flow 3: View Patient Karte History

```
Practitioner opens customer detail page
  or appointment page "History" tab
         |
         v
[Server Component]
  - prisma.karte.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: { transcription: { select: { fullText: true } } }
    })
         |
         v
[Karte History List]
  - Show date, service, status, tags
  - Click to expand: show content, transcript
  - Link to full appointment page
```

## Streaming Architecture: SSE Over WebSocket

**Decision: Use Server-Sent Events (SSE), not WebSocket.**

**Rationale:**

| Factor | SSE | WebSocket |
|--------|-----|-----------|
| Direction | Server-to-client (sufficient for transcription deltas) | Bidirectional |
| Next.js support | Native via ReadableStream in Route Handlers | Requires custom server, breaks serverless deployment |
| Vercel deployment | Works out of the box | Not supported on serverless |
| Complexity | Low (standard HTTP) | High (connection management, heartbeats) |
| Auth | Standard cookies/headers on initial request | Custom auth handshake needed |
| Reconnection | Built into EventSource API | Manual implementation |
| Our use case | Transcription results flow server-to-client; audio flows client-to-server via POST | Bidirectional not needed |

**Audio upload is client-to-server via POST requests, not streaming.** The client sends audio chunks every 5 seconds as FormData POSTs. This is simpler and more reliable than WebSocket binary streaming, works with existing auth middleware, and allows retry on individual chunks.

### SSE Route Handler Pattern

```typescript
// app/api/transcription/stream/route.ts
import { NextRequest } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'

export const runtime = 'nodejs'  // Required for streaming
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return new Response('Unauthorized', { status: 401 })
  }

  const formData = await request.formData()
  const audioChunk = formData.get('audio') as File
  const karteId = formData.get('karteId') as string

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      try {
        // Forward audio to OpenAI transcription API
        const transcriptionResult = await transcribeChunk(audioChunk)

        // Send transcript delta as SSE event
        const event = `data: ${JSON.stringify({
          type: 'transcript_delta',
          text: transcriptionResult.text,
          segments: transcriptionResult.segments,
        })}\n\n`
        controller.enqueue(encoder.encode(event))

        // Signal completion of this chunk
        controller.enqueue(encoder.encode('data: {"type":"chunk_complete"}\n\n'))
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',  // Prevent nginx buffering
    },
  })
}
```

### Client-Side SSE Consumption

```typescript
// hooks/useTranscriptionStream.ts
'use client'

import { useState, useCallback, useRef } from 'react'

interface TranscriptSegment {
  speaker: string
  start: number
  end: number
  text: string
}

export function useTranscriptionStream(karteId: string) {
  const [transcript, setTranscript] = useState('')
  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendChunk = useCallback(async (audioBlob: Blob) => {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'chunk.webm')
    formData.append('karteId', karteId)

    try {
      const response = await fetch('/api/transcription/stream', {
        method: 'POST',
        body: formData,
        // No Content-Type header -- browser sets multipart boundary
      })

      if (!response.ok || !response.body) return

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))

          if (data.type === 'transcript_delta') {
            setTranscript(prev => prev + ' ' + data.text)
            if (data.segments) {
              setSegments(prev => [...prev, ...data.segments])
            }
          }
        }
      }
    } catch (error) {
      console.error('Transcription stream error:', error)
    }
  }, [karteId])

  return { transcript, segments, isStreaming, sendChunk }
}
```

## AI Provider Abstraction

### Interface Design

```typescript
// lib/ai/types.ts
export interface TranscriptionResult {
  text: string
  segments: Array<{
    speaker?: string
    start: number
    end: number
    text: string
  }>
  language: string
  duration: number
}

export interface KarteContent {
  chiefComplaint: string    // 主訴
  subjective: string        // 自覚症状 (S)
  objective: string         // 他覚所見 (O)
  assessment: string        // 評価 (A)
  plan: string              // 計画 (P)
  tags: string[]
}

export interface TranscriptionProvider {
  transcribeChunk(audio: Blob, language?: string): Promise<TranscriptionResult>
  transcribeFull(audioPath: string, language?: string): Promise<TranscriptionResult>
}

export interface KarteGenerationProvider {
  generateKarte(
    transcript: string,
    context: { serviceName: string; customerName: string; practitionerName: string }
  ): AsyncGenerator<{ field: keyof KarteContent; delta: string }>
}

// lib/ai/provider.ts
export function getTranscriptionProvider(): TranscriptionProvider {
  const provider = process.env.TRANSCRIPTION_PROVIDER || 'openai'
  switch (provider) {
    case 'openai': return new OpenAITranscriptionProvider()
    // Future: case 'deepgram': return new DeepgramProvider()
    default: throw new Error(`Unknown transcription provider: ${provider}`)
  }
}

export function getKarteGenerationProvider(): KarteGenerationProvider {
  const provider = process.env.KARTE_GENERATION_PROVIDER || 'openai'
  switch (provider) {
    case 'openai': return new OpenAIKarteProvider()
    default: throw new Error(`Unknown karte provider: ${provider}`)
  }
}
```

### OpenAI Implementation

```typescript
// lib/ai/providers/openai.ts
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export class OpenAITranscriptionProvider implements TranscriptionProvider {
  async transcribeChunk(audio: Blob, language = 'ja'): Promise<TranscriptionResult> {
    const file = new File([audio], 'chunk.webm', { type: 'audio/webm' })

    const response = await openai.audio.transcriptions.create({
      model: 'gpt-4o-mini-transcribe',
      file,
      language,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    })

    return {
      text: response.text,
      segments: (response.segments ?? []).map(s => ({
        start: s.start,
        end: s.end,
        text: s.text,
      })),
      language: response.language ?? language,
      duration: response.duration ?? 0,
    }
  }

  async transcribeFull(audioPath: string, language = 'ja'): Promise<TranscriptionResult> {
    // Download from Supabase Storage, then transcribe
    // Use gpt-4o-transcribe for full-file (higher accuracy)
    // ...implementation
  }
}
```

**Model choice:** Use `gpt-4o-mini-transcribe` for live chunk transcription (fast, cheap) and `gpt-4o-transcribe` for full-file re-transcription (higher accuracy). OpenAI recommends `gpt-4o-mini-transcribe` for best results per their December 2025 release notes.

**Japanese language:** Both gpt-4o-transcribe models support Japanese well. The `language` parameter hint improves accuracy. For a wellness/bodywork context, a custom prompt can be added to guide medical terminology recognition.

## Audio Storage Strategy

### Supabase Storage Configuration

```
Bucket: karte-audio
  ├── {karteId}/
  │   ├── full.webm           # Concatenated final recording
  │   └── chunks/             # Optional: keep raw chunks for reprocessing
  │       ├── 000.webm
  │       ├── 001.webm
  │       └── ...
```

**Storage approach:**

1. During recording: upload each 5-second chunk to `karte-audio/{karteId}/chunks/{index}.webm`
2. On finalize: concatenate server-side into `karte-audio/{karteId}/full.webm`
3. Clean up chunks after successful concatenation (optional, keep for debugging initially)
4. Use signed URLs for playback (same pattern as existing intake-forms)

**Why Supabase Storage over alternatives:** Already in use for intake forms. Same auth patterns, same SDK, same infrastructure. No new vendor needed.

**File size estimation:** 5-second chunks at opus codec ~ 10-15KB each. A 60-minute appointment produces ~720 chunks = ~10MB total. Well within Supabase Storage limits.

### Audio Storage Service

```typescript
// lib/storage/karte-audio.ts
// Follows same pattern as existing supabase-storage.ts

const BUCKET = 'karte-audio'

export async function uploadAudioChunk(
  karteId: string,
  chunkIndex: number,
  audioBlob: Blob
): Promise<{ path: string }> {
  const path = `${karteId}/chunks/${String(chunkIndex).padStart(3, '0')}.webm`
  // ... upload via Supabase client (same pattern as uploadIntakeForm)
}

export async function finalizeRecording(karteId: string): Promise<{ path: string }> {
  // List chunks, download, concatenate, upload as full.webm
  // Or: keep chunks as-is and store manifest JSON
}

export async function getAudioSignedUrl(path: string): Promise<string> {
  // Same as existing getSignedUrl but for karte-audio bucket
}

export async function deleteRecording(karteId: string): Promise<void> {
  // Delete all files under {karteId}/ prefix
}
```

## Karte Content Structure (JSON Schema)

The `Karte.content` field stores structured JSON following a SOAP-inspired format adapted for Japanese bodywork:

```typescript
interface KarteContent {
  // 主訴 - Chief complaint: what the patient reports
  chiefComplaint: string

  // 自覚症状 (S) - Subjective: patient's own description of symptoms
  subjective: string

  // 他覚所見 (O) - Objective: practitioner's observations during treatment
  objective: string

  // 評価 (A) - Assessment: practitioner's evaluation
  assessment: string

  // 施術計画 (P) - Plan: treatment plan and recommendations
  plan: string

  // AI-extracted tags for searchability
  tags: string[]

  // Metadata
  generatedAt: string          // ISO timestamp
  model: string                // AI model used
  transcriptLength: number     // chars of source transcript
}
```

## Integration Points with Existing Code

### 1. Dashboard Timetable (Modified)

The existing timetable shows bookings per worker per time slot. Add a karte status indicator:

```typescript
// Extend the existing AdminCalendarData bookings response
interface AdminCalendarBooking {
  // ... existing fields
  karteStatus: KarteStatus | null  // null = no karte created yet
}
```

Modify `/api/admin/calendar/route.ts` to include karte status:

```typescript
const bookings = await prisma.booking.findMany({
  where: { /* existing filters */ },
  include: {
    // ... existing includes
  },
})

// Batch-fetch karte statuses for all bookings
const karteStatuses = await prisma.karte.findMany({
  where: { bookingId: { in: bookings.map(b => b.id) } },
  select: { bookingId: true, status: true },
})

const karteMap = new Map(karteStatuses.map(k => [k.bookingId, k.status]))

// Add to response
const enrichedBookings = bookings.map(b => ({
  ...b,
  karteStatus: karteMap.get(b.id) ?? null,
}))
```

### 2. Customer Detail Page (Modified)

Add a "Karte History" section to the existing customer detail page at `/admin/customers/[id]`:

```typescript
// Fetch kartes alongside existing medical records
const [medicalRecords, kartes] = await Promise.all([
  getMedicalRecordsWithSignedUrls(customerId),
  prisma.karte.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      bookingId: true,
      status: true,
      tags: true,
      content: true,
      createdAt: true,
    },
  }),
])
```

### 3. Auth (Unchanged)

All new API routes use the existing `getAdminSession()` pattern. No auth changes needed.

## Patterns to Follow

### Pattern 1: Chunked Upload with Server-Side Accumulation

**What:** Client sends audio chunks via FormData POST every 5 seconds. Server stores and processes independently.

**When:** During live recording sessions.

**Why:** Reliable over spotty connections (each chunk is independent HTTP request with automatic retry). No WebSocket complexity. Works with existing middleware and auth.

**Key detail:** The client maintains a chunk counter and sends `chunkIndex` with each upload. If a chunk fails, the client retries that specific chunk. The server can detect gaps and request re-uploads.

### Pattern 2: Provider Abstraction for AI Services

**What:** Abstract transcription and karte generation behind interfaces. Implementations are injected via factory function based on environment config.

**When:** All AI API calls.

**Why:** Allows switching from OpenAI to Deepgram (or others) without touching route handlers or service layer. Particularly important for transcription -- Deepgram offers real-time WebSocket streaming that may be preferable later, and pricing/accuracy landscape shifts frequently.

### Pattern 3: Optimistic UI with Server Reconciliation

**What:** Show transcript text immediately in UI as SSE events arrive. Reconcile with server state on completion.

**When:** Live transcription display.

**Why:** Perceived latency must be minimal. The practitioner needs to see words appearing in near-real-time during the appointment. Final reconciliation ensures accuracy.

### Pattern 4: JSON Content Fields for Flexible Schema

**What:** Store karte content and transcription segments as Prisma `Json` fields rather than separate tables/columns.

**When:** Storing structured AI output.

**Why:** AI output structure may evolve (new fields, different formats). JSON avoids schema migrations for content changes. Query by content fields using Prisma's JSON filtering when needed. The outer schema (Karte, Recording, Transcription models) remains stable while inner content evolves.

## Anti-Patterns to Avoid

### Anti-Pattern 1: WebSocket for Transcription

**What:** Using WebSocket for bidirectional audio streaming.

**Why bad:** Breaks serverless deployment (Vercel). Requires custom server. Connection management overhead. Not needed -- audio goes client-to-server (POST), transcripts go server-to-client (SSE).

**Instead:** POST for uploads, SSE for streaming responses.

### Anti-Pattern 2: Client-Side Audio Processing

**What:** Running transcription models in the browser (e.g., whisper.cpp via WASM).

**Why bad:** Huge download (>100MB model), drains battery, inconsistent quality across devices, no GPU acceleration on most devices.

**Instead:** Server-side transcription via API. Client only handles recording and chunk uploads.

### Anti-Pattern 3: Single Large Audio Upload

**What:** Recording entire appointment audio, then uploading as one file at the end.

**Why bad:** No live transcription possible. Large upload can fail. If browser crashes, entire recording is lost.

**Instead:** 5-second chunk uploads throughout recording. Each chunk is independently stored and transcribed.

### Anti-Pattern 4: Storing Audio in Database

**What:** Putting audio binary data in PostgreSQL.

**Why bad:** Bloats database, slow queries, expensive storage, no CDN benefit, no streaming playback.

**Instead:** Supabase Storage (object storage) with signed URLs for access. Same pattern already used for intake forms.

### Anti-Pattern 5: Tight Coupling to OpenAI API Shape

**What:** Using OpenAI SDK types directly in route handlers and components.

**Why bad:** Vendor lock-in. When Deepgram or Google offers better Japanese transcription, refactoring touches every file.

**Instead:** Provider abstraction with internal types. Only the provider implementation file imports the vendor SDK.

## Build Order (Dependency-Driven)

The features have clear dependencies that dictate build order:

```
Phase 1: Data Foundation
  |
  ├── Prisma models (Karte, Recording, Transcription)
  ├── Karte service (CRUD operations)
  ├── Audio storage service (Supabase bucket setup)
  └── AI provider abstraction (interfaces + OpenAI impl)
        |
Phase 2: Recording & Transcription
  |
  ├── MediaRecorder hook (client-side audio capture)
  ├── Audio upload API route
  ├── Transcription stream API route (SSE)
  ├── Transcription viewer component
  └── Recording controls component
        |
Phase 3: Karte Generation & Display
  |
  ├── Karte generation API route (SSE)
  ├── Karte editor/viewer component
  ├── Karte history component
  └── Save/update server actions
        |
Phase 4: Dashboard Integration
  |
  ├── Extend calendar API with karte status
  ├── Appointment page (combines recording + karte)
  ├── Dashboard karte status indicators
  └── Customer detail karte history section
```

**Why this order:**
1. Models and services first -- everything depends on data layer
2. Recording and transcription second -- this is the core new capability and the hardest technically (streaming, audio handling)
3. Karte generation third -- depends on transcription output existing
4. Dashboard integration last -- depends on all the above working, and is lower risk (extending existing UI)

## Scalability Considerations

| Concern | At 10 appointments/day | At 100 appointments/day | At 1,000 appointments/day |
|---------|------------------------|-------------------------|--------------------------|
| **Audio storage** | ~100MB/day, Supabase free tier | ~1GB/day, Supabase Pro | ~10GB/day, consider S3 or cleanup policies |
| **Transcription API cost** | ~$0.36/day (60min avg) | ~$3.60/day | ~$36/day, consider Deepgram or self-hosted Whisper |
| **SSE connections** | No concern | No concern | Monitor server memory per connection |
| **Database** | Minimal impact | Add indexes on karte queries | Partition kartes by date if needed |
| **Concurrent recordings** | 1-3 simultaneous, fine | 5-10, fine with chunked approach | Consider queue for transcription API calls |

## Sources

**HIGH Confidence:**
- Existing SYNQ codebase analysis (Prisma schema, storage patterns, auth patterns, API routes)
- [OpenAI Speech to Text API Docs](https://developers.openai.com/api/docs/guides/speech-to-text)
- [OpenAI GPT-4o Transcribe Model](https://developers.openai.com/api/docs/models/gpt-4o-transcribe)
- [MediaRecorder API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [Supabase Storage Standard Uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)

**MEDIUM Confidence:**
- [Streaming in Next.js 15: WebSockets vs Server-Sent Events](https://hackernoon.com/streaming-in-nextjs-15-websockets-vs-server-sent-events) - SSE vs WebSocket comparison for Next.js
- [Fixing Slow SSE Streaming in Next.js and Vercel](https://medium.com/@oyetoketoby80/fixing-slow-sse-server-sent-events-streaming-in-next-js-and-vercel-99f42fbdb996) - SSE gotchas
- [Using SSE to stream LLM responses in Next.js](https://upstash.com/blog/sse-streaming-llm-responses) - SSE pattern with ReadableStream
- [Best Speech-to-Text APIs in 2026](https://deepgram.com/learn/best-speech-to-text-apis-2026) - Provider comparison
- [OpenAI Realtime Transcription API](https://developers.openai.com/api/docs/guides/realtime-transcription/) - Realtime API alternative

**LOW Confidence:**
- [Streaming and Caching with Supabase (ElevenLabs)](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/text-to-speech/streaming-and-caching-with-supabase) - Audio + Supabase patterns (different use case but informative)
- Japanese EMR architecture patterns (limited English-language sources available)
