# Technology Stack - SYNQ Karte (AI Electronic Medical Records)

**Project:** SYNQ Karte - AI-powered electronic medical records for Japanese wellness businesses
**Domain:** Live transcription, auto-tagging, translation, waveform visualization, audio storage
**Researched:** 2026-03-07
**Overall confidence:** HIGH

**Scope:** This document covers ONLY the new stack additions needed for the Karte milestone. The existing stack (Next.js 15, Prisma, Supabase PostgreSQL, Tailwind CSS, next-intl, SWR, Zod, Resend, Upstash Redis) is validated and not re-researched.

---

## Executive Summary

The Karte feature requires five new capability domains: (1) browser audio capture, (2) real-time streaming transcription, (3) AI text processing for tagging/translation, (4) waveform visualization, and (5) audio file storage. The recommended approach uses the **Vercel AI SDK 6** as the unified abstraction layer for all AI operations, **OpenAI's Realtime API** for streaming transcription via WebSocket, **Deepgram as fallback provider**, **wavesurfer.js** for waveform rendering, and **Supabase Storage** for audio files (already in the stack via `@supabase/supabase-js`).

**Key architectural decision:** Use OpenAI's Realtime API in transcription-only mode for live transcription (WebSocket streaming with incremental results), and the AI SDK `transcribe()` function for post-session batch transcription. This gives real-time UX during recording and high-accuracy final transcripts after.

---

## Recommended Stack Additions

### AI Provider Abstraction

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| ai | ^6.0.x | Unified AI SDK | Single abstraction for transcription, text generation (tagging/translation), and multi-provider support. Already supports OpenAI and Deepgram transcription via `transcribe()`. Streaming text via `streamText()` for live translation. Version 6 is latest stable (v6.0.116 as of March 2026). |
| @ai-sdk/openai | ^3.0.x | OpenAI provider | Provides `openai.transcription('whisper-1')` and `openai('gpt-4o-mini')` for tagging/translation. Handles both Realtime API and standard API calls. |
| @ai-sdk/deepgram | latest | Deepgram provider | Fallback transcription provider. Deepgram Nova-3 has strong Japanese support with lower latency for streaming. Use if OpenAI Realtime API costs are too high or latency is unacceptable. |

**Confidence:** HIGH -- AI SDK 6 verified via npm (v6.0.116 published March 2026), transcription support verified via official docs.

**Why AI SDK 6 (not direct API calls):**
- Unified interface: switch between OpenAI and Deepgram transcription without code changes
- TypeScript-first with full type inference
- Built-in streaming support via `streamText()` for real-time translation
- Already designed for Next.js App Router (Route Handlers, Server Actions)
- Experimental `transcribe()` function provides consistent API across providers

**Why NOT AI SDK 5:** v6 is current stable. Migration from v5 to v6 is minimal (v3 Language Model Specification update, not a breaking redesign). No reason to pin to v5.

---

### Real-Time Streaming Transcription

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| openai | ^4.x | OpenAI Node SDK | Required for Realtime API WebSocket connections. The AI SDK `transcribe()` handles batch transcription, but live streaming requires the OpenAI Realtime API directly via WebSocket. |

**Confidence:** HIGH -- OpenAI Realtime API transcription-only mode verified via official docs (developers.openai.com).

**Architecture: Two-tier transcription strategy**

1. **Live (during recording):** OpenAI Realtime API in transcription-only mode via WebSocket
   - Uses `gpt-4o-mini-transcribe` for incremental streaming (lower cost, good accuracy)
   - WebSocket session type set to transcription (no audio output, no conversation)
   - Receives `conversation.item.input_audio_transcription.delta` events with incremental text
   - Voice Activity Detection (VAD) built in for turn boundary management
   - Cost: ~$0.003/minute (gpt-4o-mini-transcribe)

2. **Post-session (after recording):** AI SDK `transcribe()` with `gpt-4o-transcribe` or `whisper-1`
   - Higher accuracy final transcript from complete audio file
   - Produces timestamped segments for playback synchronization
   - Cost: $0.006/minute (whisper-1/gpt-4o-transcribe)

**Why NOT Deepgram for primary live transcription:**
- OpenAI models have broader Japanese language training data
- Keeping primary provider unified (OpenAI for transcription + GPT for tagging/translation) reduces complexity
- Deepgram Nova-3 Japanese support is good but newer -- use as fallback if OpenAI quality disappoints

**Why NOT a custom WebSocket server:**
- Next.js App Router on Vercel does not support WebSocket upgrade in Route Handlers (serverless limitation)
- The browser connects directly to OpenAI's Realtime API endpoint (no proxy needed for transcription-only)
- For production with auth: use a short-lived ephemeral token generated via server-side Route Handler, browser uses token to connect directly to OpenAI

**Streaming pattern for Next.js App Router:**

```typescript
// app/api/karte/transcription-token/route.ts
// Server-side: generate ephemeral token for client WebSocket
export async function POST(request: Request) {
  // Validate auth, rate limit
  const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-transcribe',
      // transcription-only session config
    }),
  });
  const { client_secret } = await response.json();
  return Response.json({ token: client_secret.value });
}

// Client-side: connect directly to OpenAI Realtime API
// Browser -> OpenAI WebSocket (no server proxy)
```

---

### AI Text Processing (Tagging & Translation)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| ai (streamText) | ^6.0.x | Live translation & auto-tagging | `streamText()` for streaming ja->en translation as transcription arrives. `generateText()` for batch auto-tagging of completed sessions. Uses structured output with Zod schemas (already in stack) for tag extraction. |

**Confidence:** HIGH -- AI SDK streamText/generateText are core, well-documented features.

**Auto-tagging approach:**
- Use `generateText()` with `output: 'object'` and a Zod schema to extract structured tags from transcript
- Tags: symptoms, treatments, recommendations, follow-up items
- Model: `gpt-4o-mini` (cost-effective for classification tasks)
- Run after session ends (batch, not real-time) to keep costs down

**Live translation approach:**
- Use `streamText()` to translate transcript chunks as they arrive
- Model: `gpt-4o-mini` for speed and cost
- Direction: ja->en and en->ja based on detected source language
- Stream translations to client via Server-Sent Events (SSE) from Route Handler

**Why SSE (not WebSocket) for translation streaming:**
- Next.js App Router Route Handlers support SSE via ReadableStream natively
- Translation is server->client only (one-directional), perfect for SSE
- No custom server needed, works on Vercel serverless

```typescript
// app/api/karte/translate/route.ts
export async function POST(request: Request) {
  const { text, targetLang } = await request.json();
  const result = streamText({
    model: openai('gpt-4o-mini'),
    prompt: `Translate to ${targetLang}: ${text}`,
  });
  return result.toTextStreamResponse();
}
```

---

### Browser Audio Capture

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| MediaRecorder API | Browser native | Audio recording | No library needed. Built into all modern browsers. Records audio as chunks (Blob). Use `audio/webm;codecs=opus` for compression. |
| Web Audio API | Browser native | Audio processing | Required for waveform visualization (AnalyserNode for frequency data). Connects to MediaRecorder via MediaStream. |

**Confidence:** HIGH -- Browser APIs, well-documented, universally supported.

**No npm package needed for recording.** The MediaRecorder API is sufficient. Avoid libraries like `recordrtc` or `react-media-recorder` -- they add abstraction over simple APIs and often have stale dependencies.

**Audio format strategy:**
- **During recording:** `audio/webm;codecs=opus` (compressed, small chunks for streaming to transcription API)
- **For storage:** Convert to `audio/webm` or `audio/mp4` after recording ends
- **For Whisper API batch transcription:** Send as-is (Whisper accepts webm, mp4, wav, etc.)

**Key implementation pattern:**

```typescript
// Custom React hook -- no library needed
function useAudioRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    source.connect(analyser);
    analyserRef.current = analyser;

    const recorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    recorder.ondataavailable = (event) => {
      // Send chunk to OpenAI Realtime API WebSocket
      // Also accumulate for final file storage
    };

    recorder.start(250); // 250ms chunks for low-latency streaming
    mediaRecorderRef.current = recorder;
  };
  // ...
}
```

---

### Waveform Visualization

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| wavesurfer.js | ^7.12.x | Waveform rendering | Industry standard for audio waveforms. 7.12.1 is latest (March 2026). Renders via Web Audio API + HTML5 Canvas. Plugins for recording, regions, timeline. |
| @wavesurfer/react | ^1.0.x | React integration | Official React wrapper. Provides `useWavesurfer` hook and `<WaveSurfer>` component. v1.0.12 latest. |

**Confidence:** HIGH -- wavesurfer.js verified via npm/GitHub, actively maintained, 9k+ stars.

**Why wavesurfer.js:**
- Built-in Record plugin (captures from microphone with waveform visualization)
- Regions plugin for marking segments (useful for highlighting tagged sections)
- Timeline plugin for time markers
- Renders into Shadow DOM (CSS isolation from Tailwind -- no conflicts)
- Lightweight: only loads plugins you use

**Why NOT canvas-based custom implementation:**
- wavesurfer.js handles edge cases (resize, zoom, seek) that take weeks to build manually
- Plugin ecosystem (Record, Regions, Hover, Timeline) covers all Karte needs
- Well-tested across browsers

**Two rendering modes needed:**

1. **Live recording:** Use Web Audio API AnalyserNode directly for real-time waveform (wavesurfer Record plugin)
2. **Playback:** Use wavesurfer.js to render completed recording waveform with seek, regions, timeline

```typescript
// Playback with regions for tagged sections
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';

const ws = WaveSurfer.create({
  container: '#waveform',
  waveColor: '#4F46E5',
  progressColor: '#818CF8',
  plugins: [
    RegionsPlugin.create(),
    TimelinePlugin.create(),
  ],
});

// Add region for a tagged symptom mention
ws.plugins[0].addRegion({
  start: 12.5,
  end: 18.3,
  color: 'rgba(239, 68, 68, 0.2)',
  content: 'Symptom: lower back pain',
});
```

---

### Audio File Storage

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @supabase/supabase-js | ^2.97.x (already installed) | Audio file storage | Supabase Storage is included in the existing Supabase plan. No new dependency needed. Create a private bucket for audio files with RLS policies. |

**Confidence:** HIGH -- Supabase Storage verified via official docs, already using Supabase in the project.

**Why Supabase Storage (not S3 directly):**
- Already paying for Supabase -- Storage is included (1 GB free, $0.021/GB/month on Pro)
- Same RLS policies as database -- audio files inherit tenant isolation
- Signed URLs for secure playback (2-hour expiry)
- No new SDK or credentials to manage
- File size limit: 50 MB free tier, 500 GB on Pro (more than enough for audio sessions)

**Storage architecture:**

```
Bucket: karte-audio (private)
Path: /{tenantId}/{karteId}/{filename}
Format: audio/webm (opus codec)
```

**Upload pattern (chunked for large recordings):**

```typescript
// Server Action for audio upload
'use server';
import { createClient } from '@/lib/supabase-server';

export async function uploadKarteAudio(karteId: string, audioBlob: Blob) {
  const supabase = createClient();
  const path = `${tenantId}/${karteId}/recording.webm`;

  const { data, error } = await supabase.storage
    .from('karte-audio')
    .upload(path, audioBlob, {
      contentType: 'audio/webm',
      upsert: true,
    });

  return data?.path;
}
```

**Cost estimation:**
- Average session: 30 minutes = ~5 MB (webm/opus)
- 100 sessions/month = 500 MB = ~$0.01/month
- 1,000 sessions/month = 5 GB = ~$0.10/month
- Audio storage cost is negligible

---

## Data Model Additions (Prisma)

These are new models needed in the existing Prisma schema. Not a technology choice but critical for stack integration.

| Model | Purpose | Key Fields |
|-------|---------|------------|
| Karte | Medical record per appointment | appointmentId, customerId, transcript, translatedTranscript, audioPath, duration, status |
| KarteTag | Auto-generated tags | karteId, type (symptom/treatment/recommendation), content, confidence, startTime, endTime |
| TranscriptSegment | Timestamped transcript chunks | karteId, text, startTime, endTime, speaker, language |

**Confidence:** HIGH -- standard relational modeling, Prisma schema design.

---

## Environment Variables (New)

```bash
# AI Provider Keys
OPENAI_API_KEY="sk-..."              # For transcription + tagging + translation
DEEPGRAM_API_KEY="..."               # Fallback transcription provider (optional initially)

# No new Supabase vars needed -- reuse existing SUPABASE_URL and keys
```

---

## Installation Commands

```bash
# AI SDK 6 + Providers
npm install ai @ai-sdk/openai

# OpenAI SDK (for Realtime API WebSocket)
npm install openai

# Waveform visualization
npm install wavesurfer.js @wavesurfer/react

# Optional: Deepgram fallback (add when needed)
# npm install @ai-sdk/deepgram
```

**Total new dependencies: 4** (ai, @ai-sdk/openai, openai, wavesurfer.js + @wavesurfer/react)

---

## What NOT to Add

| Technology | Why Avoid |
|------------|-----------|
| recordrtc / react-media-recorder | Unnecessary abstraction over MediaRecorder API. Adds bundle size for no benefit. |
| socket.io | Not needed. OpenAI Realtime API uses native WebSocket. Next.js SSE handles server-to-client streaming. |
| AWS S3 / Cloudflare R2 | Already have Supabase Storage. Adding another storage provider means another SDK, credentials, and billing. |
| Google Cloud Speech-to-Text | More complex setup (service accounts, GCP project). OpenAI transcription is simpler and sufficient. Add Gemini later only if needed for cost optimization. |
| Custom WebSocket server | Next.js on Vercel cannot handle WebSocket upgrade. Browser connects directly to OpenAI. Don't build a proxy. |
| ffmpeg.wasm | Audio format conversion in browser is slow and heavy (~25 MB). Whisper/transcription APIs accept webm directly. Convert server-side only if needed later. |
| AssemblyAI | Good product but adds another vendor. OpenAI + optional Deepgram covers transcription needs. |
| react-audio-visualize | Small library with limited features. wavesurfer.js is more mature and feature-complete. |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| AI abstraction | AI SDK 6 | Direct API calls | AI SDK provides provider switching, streaming utilities, structured output. Direct calls require more boilerplate. |
| Live transcription | OpenAI Realtime API | Deepgram Streaming | OpenAI has deeper Japanese training data. Single vendor for transcription + tagging reduces complexity. Deepgram reserved as fallback. |
| Batch transcription | AI SDK transcribe() | OpenAI Whisper API direct | AI SDK wraps the same API with type safety and provider abstraction. |
| Waveform | wavesurfer.js | Custom Canvas | wavesurfer.js handles resize, zoom, seek, plugins. Custom Canvas takes weeks for same quality. |
| Audio storage | Supabase Storage | AWS S3 | Already using Supabase. Same RLS policies. No new credentials. |
| Translation | GPT-4o-mini via streamText | Google Translate API | GPT handles medical/wellness terminology better. Streaming integration with AI SDK is seamless. Translate API is literal translation. |
| Auto-tagging | GPT-4o-mini structured output | Custom NLP/NER | GPT understands medical context without training. Structured output with Zod ensures type-safe tags. Custom NER requires training data we don't have. |
| Real-time streaming | SSE (Route Handlers) | WebSocket | SSE works on Vercel serverless. WebSocket requires custom server. Translation streaming is server->client only. |

---

## Cost Estimation

| Service | Usage | Cost/Month (est.) |
|---------|-------|-------------------|
| OpenAI Realtime (live transcription) | 100 sessions x 30 min = 3,000 min | ~$9.00 (gpt-4o-mini-transcribe at $0.003/min) |
| OpenAI Whisper (batch re-transcription) | 100 sessions x 30 min = 3,000 min | ~$18.00 (whisper-1 at $0.006/min) |
| OpenAI GPT-4o-mini (tagging + translation) | ~500K tokens/month | ~$0.50 |
| Supabase Storage (audio) | ~500 MB | ~$0.01 |
| **Total** | | **~$27.50/month at 100 sessions** |

At scale (1,000 sessions/month): ~$275/month. Manageable for a B2B SaaS.

**Cost optimization opportunities:**
- Skip batch re-transcription if live transcript quality is sufficient
- Cache translations for repeated phrases (wellness terminology is repetitive)
- Use Deepgram ($0.0043/min) instead of OpenAI for live transcription to save ~30%

---

## Integration Points with Existing Stack

| Existing Tech | Integration Point | Notes |
|---------------|-------------------|-------|
| Next.js App Router | Route Handlers for SSE streaming, Server Actions for audio upload | SSE via ReadableStream in Route Handlers. No custom server needed. |
| Prisma | New Karte/KarteTag/TranscriptSegment models | Add to existing schema.prisma. Standard relations to existing Customer and Appointment models. |
| Supabase | Storage bucket for audio, existing auth for RLS | Create `karte-audio` bucket with RLS policies matching existing tenant isolation. |
| SWR | Polling for transcription status, karte data fetching | Use `refreshInterval` for live transcript updates during recording. |
| Zod | Structured output schemas for auto-tagging | AI SDK `output: 'object'` uses Zod schemas directly. Reuse existing Zod patterns. |
| next-intl | UI labels for karte interface | Standard i18n, no special integration needed. |
| JWT admin auth | Protect transcription token endpoint | Validate admin JWT before issuing OpenAI ephemeral token. |
| Upstash Redis | Rate limit transcription API calls | Prevent abuse of expensive AI API endpoints. |

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| AI SDK 6 | HIGH | npm verified v6.0.116, official docs confirm transcription support |
| OpenAI Realtime API | HIGH | Official docs, transcription-only mode documented, pricing verified |
| MediaRecorder/Web Audio | HIGH | Browser standards, universally supported |
| wavesurfer.js | HIGH | npm verified v7.12.1, active maintenance, 9k+ GitHub stars |
| Supabase Storage | HIGH | Official docs, already using Supabase in project |
| Japanese transcription quality | MEDIUM | OpenAI Whisper supports Japanese well, but medical/wellness vocabulary may need prompt tuning |
| Live translation accuracy | MEDIUM | GPT-4o-mini handles ja/en well but medical terminology may need glossary prompts |
| Cost estimates | MEDIUM | Based on published pricing, actual usage patterns may differ |

---

## Sources

### AI SDK
- [AI SDK 6 Release](https://vercel.com/blog/ai-sdk-6) -- AI SDK 6 announcement
- [AI SDK Transcription Docs](https://ai-sdk.dev/docs/ai-sdk-core/transcription) -- transcribe() function reference
- [AI SDK npm](https://www.npmjs.com/package/ai) -- v6.0.116 current
- [@ai-sdk/openai npm](https://www.npmjs.com/package/@ai-sdk/openai) -- v3.0.41 current
- [AI SDK Deepgram Provider](https://ai-sdk.dev/providers/ai-sdk-providers/deepgram) -- Deepgram integration

### OpenAI Realtime API
- [Realtime Transcription Guide](https://developers.openai.com/api/docs/guides/realtime-transcription/) -- transcription-only mode
- [Realtime API WebSocket](https://developers.openai.com/api/docs/guides/realtime-websocket/) -- WebSocket connection reference
- [OpenAI Pricing](https://developers.openai.com/api/docs/pricing) -- per-minute transcription costs
- [GPT-4o Transcribe Model](https://developers.openai.com/api/docs/models/gpt-4o-transcribe) -- model capabilities
- [Speech to Text Guide](https://developers.openai.com/api/docs/guides/speech-to-text) -- batch transcription reference

### Deepgram
- [Deepgram Nova-3 Japanese Support](https://deepgram.com/learn/deepgram-expands-nova-3-with-11-new-languages-across-europe-and-asia) -- Japanese language expansion
- [Deepgram JS SDK npm](https://www.npmjs.com/package/@deepgram/sdk) -- v4.11.3 current
- [Deepgram vs OpenAI Comparison](https://deepgram.com/learn/whisper-vs-deepgram) -- accuracy and latency benchmarks

### Waveform Visualization
- [wavesurfer.js Official](https://wavesurfer.xyz/) -- documentation and examples
- [wavesurfer.js GitHub](https://github.com/katspaugh/wavesurfer.js) -- v7.12.1 latest
- [@wavesurfer/react npm](https://www.npmjs.com/package/@wavesurfer/react) -- v1.0.12, official React wrapper

### Audio Storage
- [Supabase Storage Pricing](https://supabase.com/docs/guides/storage/pricing) -- $0.021/GB/month
- [Supabase Storage File Limits](https://supabase.com/docs/guides/storage/uploads/file-limits) -- 50 MB free, 500 GB Pro
- [Supabase JS Upload Reference](https://supabase.com/docs/reference/javascript/storage-from-upload) -- upload API

### Next.js Streaming Patterns
- [SSE in Next.js App Router](https://www.pedroalonso.net/blog/sse-nextjs-real-time-notifications/) -- SSE via ReadableStream
- [WebSocket Limitations Discussion](https://github.com/vercel/next.js/discussions/58698) -- why WebSocket won't work in Route Handlers
- [Streaming in Next.js 15](https://hackernoon.com/streaming-in-nextjs-15-websockets-vs-server-sent-events) -- SSE vs WebSocket comparison

### Speech-to-Text Ecosystem
- [Best APIs for Real-Time Transcription 2026](https://www.assemblyai.com/blog/best-api-models-for-real-time-speech-recognition-and-transcription) -- ecosystem overview
- [Best Speech-to-Text APIs 2026](https://deepgram.com/learn/best-speech-to-text-apis-2026) -- comparison guide
