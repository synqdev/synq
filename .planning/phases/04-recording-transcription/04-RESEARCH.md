# Phase 4: Recording & Transcription - Research

**Researched:** 2026-03-07
**Domain:** In-browser audio recording, waveform visualization, cloud storage upload, AI transcription
**Confidence:** HIGH

## Summary

Phase 4 builds the audio recording and transcription pipeline for SYNQ Karte. The practitioner records a treatment session in-browser using the MediaRecorder API, sees a live waveform and timer, then the audio is uploaded to Supabase Storage and sent to OpenAI for transcription. Transcription segments with timestamps and speaker labels are stored in the existing `TranscriptionSegment` model.

Phase 3 already built all the backend infrastructure: Prisma models (`RecordingSession`, `TranscriptionSegment`), the recording service with full CRUD, the storage module (`uploadRecording`, `getRecordingSignedUrl`, `deleteRecording`), server actions, Zod validation schemas, and the upload API route at `/api/admin/recordings/upload`. Phase 4's job is purely: (1) build the client-side recording UI, (2) add the transcription API route and service, and (3) wire everything together.

**Primary recommendation:** Use the native MediaRecorder API with `audio/webm;codecs=opus` (no external recording libraries needed), Web Audio API AnalyserNode for waveform visualization, and OpenAI's `gpt-4o-transcribe-diarize` model for transcription with built-in speaker labels. Install the `openai` npm package as the only new dependency.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openai | ^4.x (latest) | OpenAI API client for Whisper/transcription | Official SDK, TypeScript-first, handles multipart uploads |

### Browser APIs (no install needed)
| API | Purpose | Why Standard |
|-----|---------|--------------|
| MediaRecorder | Record audio from microphone | Native browser API, all modern browsers support WebM/Opus |
| Web Audio API (AudioContext + AnalyserNode) | Real-time waveform visualization | Native API, no external library needed |
| navigator.mediaDevices.getUserMedia | Access microphone | Standard API for media device access |

### Already Installed (from Phase 3)
| Library | Version | Purpose |
|---------|---------|---------|
| @supabase/supabase-js | ^2.97.0 | Supabase Storage uploads (recording-storage.ts already built) |
| swr | ^2.4.0 | Data fetching/polling for recording state |
| zod | (installed) | Validation schemas (karute.ts already has recording schemas) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native MediaRecorder | RecordRTC | RecordRTC adds bundle size but provides more format flexibility; not needed since WebM is sufficient and supported by Whisper API |
| Canvas waveform | wavesurfer.js | wavesurfer.js is for audio file playback visualization, not live recording; overkill for real-time mic input |
| openai SDK | Raw fetch to API | SDK handles multipart file upload, type safety, retries; worth the dependency |
| gpt-4o-transcribe-diarize | whisper-1 + verbose_json | whisper-1 gives segment timestamps but no speaker labels; diarize model gives both automatically |

**Installation:**
```bash
npm install openai
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  hooks/
    useAudioRecorder.ts        # MediaRecorder + AudioContext hook
    useWaveform.ts             # AnalyserNode -> canvas waveform data hook
  components/
    recording/
      RecordingPanel.tsx        # Main recording UI (timer, waveform, controls)
      WaveformVisualizer.tsx    # Canvas-based waveform component
      RecordingControls.tsx     # Start/pause/resume/stop buttons
      RecordingTimer.tsx        # Elapsed time display (MM:SS)
      TranscriptionDisplay.tsx  # Shows transcription segments after processing
  lib/
    services/
      transcription.service.ts # Server-side: call OpenAI, store segments
    storage/
      recording-storage.ts     # Already exists from Phase 3
    validations/
      karute.ts                # Already has recording schemas from Phase 3

app/
  api/
    admin/
      recordings/
        upload/route.ts        # Already exists from Phase 3
        transcribe/route.ts    # NEW: triggers transcription pipeline
  [locale]/
    (admin)/
      admin/
        ... (recording UI integrated into appointment/karte views)
```

### Pattern 1: useAudioRecorder Hook
**What:** Custom React hook encapsulating MediaRecorder lifecycle + AudioContext for visualization data
**When to use:** Any component that needs to record audio
**Example:**
```typescript
// Source: MDN MediaRecorder API + Web Audio API docs
interface UseAudioRecorderReturn {
  status: 'idle' | 'recording' | 'paused' | 'stopped';
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<Blob>;
  audioBlob: Blob | null;
  analyserNode: AnalyserNode | null; // for waveform visualization
  elapsedSeconds: number;
}

function useAudioRecorder(): UseAudioRecorderReturn {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // ... state management

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Set up AudioContext for visualization
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    // Do NOT connect analyser to destination (would cause feedback)

    // Set up MediaRecorder for capture
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.start(1000); // Collect chunks every 1 second
    // ... store refs, update state
  };

  const stopRecording = async (): Promise<Blob> => {
    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
        resolve(blob);
      };
      mediaRecorder.stop();
    });
  };
  // ...
}
```

### Pattern 2: Canvas Waveform Visualization
**What:** Draw real-time waveform using AnalyserNode time-domain data on a canvas
**When to use:** During active recording to provide visual feedback
**Example:**
```typescript
// Source: MDN "Visualizations with Web Audio API"
function drawWaveform(
  analyser: AnalyserNode,
  canvas: HTMLCanvasElement,
  animationFrameRef: React.MutableRefObject<number>
) {
  const canvasCtx = canvas.getContext('2d')!;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const draw = () => {
    animationFrameRef.current = requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = 'rgb(20, 30, 40)'; // dark background
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(125, 158, 167)'; // matches SYNQ theme
    canvasCtx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;
      if (i === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);
      x += sliceWidth;
    }
    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  };
  draw();
}
```

### Pattern 3: Transcription API Route
**What:** Server-side route that downloads audio from Supabase, sends to OpenAI, stores segments
**When to use:** After recording is uploaded and status set to PROCESSING
**Example:**
```typescript
// POST /api/admin/recordings/transcribe
// Source: OpenAI API docs for audio transcription
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// For gpt-4o-transcribe-diarize:
const transcription = await openai.audio.transcriptions.create({
  model: 'gpt-4o-transcribe-diarize',
  file: audioFile, // File object or readable stream
  language: 'ja',
  response_format: 'diarized_json',
  chunking_strategy: 'auto', // REQUIRED for audio > 30 seconds
});

// Response includes speaker-labeled segments:
// { text: "...", speakers: [{ speaker: "A", text: "...", start: 0.0, end: 5.2 }, ...] }
```

### Pattern 4: Upload Flow (Client -> API -> Supabase -> Transcribe)
**What:** End-to-end recording upload and transcription pipeline
**When to use:** When user stops recording
```
1. User clicks Stop -> useAudioRecorder returns Blob
2. Client creates RecordingSession via server action (status: RECORDING -> COMPLETED)
3. Client uploads Blob to /api/admin/recordings/upload (already built)
4. Client calls /api/admin/recordings/transcribe with recordingSessionId
5. Transcribe route: downloads audio from Supabase, calls OpenAI, stores TranscriptionSegments
6. Updates RecordingSession status: PROCESSING -> COMPLETED (or FAILED)
7. Client polls/refreshes to show transcription results
```

### Anti-Patterns to Avoid
- **Connecting AnalyserNode to AudioContext.destination:** This creates audio feedback (plays mic input through speakers). Only connect the source to the analyser, never analyser to destination.
- **Not releasing microphone tracks:** Always call `stream.getTracks().forEach(track => track.stop())` on stop/unmount. Forgetting this leaves the mic indicator active.
- **Sending audio directly from browser to OpenAI:** Always route through your API to keep the OpenAI API key server-side. Upload to Supabase first, then transcribe server-side.
- **Storing audio as base64 in the database:** Audio files are large; always use Supabase Storage (already set up). Only store the path reference.
- **Using timeDelta instead of a proper timer:** MediaRecorder's `timeslice` parameter is unreliable for timing. Use `setInterval` or `performance.now()` for the elapsed time display.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio recording | Custom WebSocket audio streaming | MediaRecorder API | Native, handles encoding/chunking, all browsers support WebM/Opus |
| Speech-to-text | Custom ML model or Deepgram integration | OpenAI gpt-4o-transcribe-diarize | Built-in speaker diarization, excellent Japanese support, same vendor ecosystem |
| OpenAI API calls | Raw fetch with multipart form | openai npm SDK | Handles file uploads, retries, types, streaming |
| Audio format detection | Manual MIME type checking | MediaRecorder.isTypeSupported() | Browser knows what it supports |
| Timer display | Manual Date math | Simple setInterval with counter | Reliable, testable, no edge cases |

**Key insight:** The browser's native MediaRecorder + Web Audio APIs are mature and well-supported. External recording libraries add complexity without meaningful benefit for this use case (single-track audio recording with visualization).

## Common Pitfalls

### Pitfall 1: Microphone Permission Denied
**What goes wrong:** `getUserMedia` throws `NotAllowedError` or `NotFoundError`
**Why it happens:** User denies permission, or no microphone available (desktop without mic)
**How to avoid:** Show clear permission request UI before calling getUserMedia. Catch the error and display a helpful message. Check `navigator.mediaDevices` exists (requires HTTPS).
**Warning signs:** Works in dev (localhost is secure context) but fails in production without HTTPS

### Pitfall 2: WebM Duration Metadata Missing in Chrome
**What goes wrong:** Chrome produces WebM files without duration metadata, making them non-seekable
**Why it happens:** Known Chrome behavior with MediaRecorder-produced WebM files
**How to avoid:** Track duration client-side using a timer (store as `durationSeconds` on RecordingSession). The Whisper API does not need seekable files, so this only affects playback. For playback, use the stored duration.
**Warning signs:** Audio playback shows "Infinity" or "NaN" for duration

### Pitfall 3: OpenAI 25MB File Size Limit
**What goes wrong:** Transcription API rejects files larger than 25MB
**Why it happens:** Long recording sessions (60+ minutes of WebM/Opus) can exceed 25MB
**How to avoid:** WebM/Opus is very efficient (~6KB/s mono, ~22MB/hour). For sessions under 1 hour, this is usually fine. For longer sessions, implement chunked transcription: split the audio into segments, transcribe each, and merge with adjusted timestamps. The existing upload route already enforces 100MB max.
**Warning signs:** Transcription fails with 413 or size error for long recordings

### Pitfall 4: AudioContext Suspended State
**What goes wrong:** AudioContext starts in 'suspended' state, waveform shows flat line
**Why it happens:** Browsers require user interaction before allowing AudioContext to start
**How to avoid:** Create AudioContext inside a user-triggered event handler (the "Start Recording" button click). Call `audioContext.resume()` if state is 'suspended'.
**Warning signs:** Waveform visualization shows nothing despite active recording

### Pitfall 5: Memory Leak from Animation Frames
**What goes wrong:** Waveform animation continues after component unmount, causing memory leaks
**Why it happens:** `requestAnimationFrame` keeps running if not cancelled
**How to avoid:** Store the animation frame ID in a ref, cancel it with `cancelAnimationFrame` in the cleanup function of `useEffect`. Also cancel on stop.
**Warning signs:** Performance degradation after repeated start/stop cycles

### Pitfall 6: gpt-4o-transcribe-diarize Requires chunking_strategy
**What goes wrong:** API call fails for audio longer than 30 seconds
**Why it happens:** The diarize model requires `chunking_strategy: 'auto'` parameter for audio over 30 seconds
**How to avoid:** Always pass `chunking_strategy: 'auto'` in the transcription request
**Warning signs:** API error mentioning chunking_strategy for any real recording (all will be > 30s)

### Pitfall 7: Safari MediaRecorder Inconsistency
**What goes wrong:** Safari may not support `audio/webm;codecs=opus`
**Why it happens:** Safari historically lagged on MediaRecorder support
**How to avoid:** Use a MIME type fallback chain: try `audio/webm;codecs=opus`, then `audio/webm`, then `audio/mp4`. All three are accepted by the OpenAI transcription API.
**Warning signs:** Recording fails on iOS/Safari with "mimeType not supported"

## Code Examples

### Recording Upload Flow (Client-Side)
```typescript
// After user clicks Stop:
async function handleStopRecording(blob: Blob, sessionId: string) {
  // 1. Update session status
  await updateRecordingSessionAction({
    id: sessionId,
    status: 'COMPLETED',
    durationSeconds: elapsedSeconds,
    endedAt: new Date(),
  });

  // 2. Upload audio file
  const formData = new FormData();
  formData.append('file', blob, `${sessionId}.webm`);
  formData.append('recordingSessionId', sessionId);

  const uploadRes = await fetch('/api/admin/recordings/upload', {
    method: 'POST',
    body: formData,
  });

  if (!uploadRes.ok) throw new Error('Upload failed');

  // 3. Trigger transcription
  await updateRecordingSessionAction({
    id: sessionId,
    status: 'PROCESSING',
  });

  const transcribeRes = await fetch('/api/admin/recordings/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recordingSessionId: sessionId }),
  });

  if (!transcribeRes.ok) {
    await updateRecordingSessionAction({ id: sessionId, status: 'FAILED' });
  }
}
```

### Transcription Service (Server-Side)
```typescript
// src/lib/services/transcription.service.ts
import OpenAI from 'openai';
import { prisma } from '@/lib/db/client';
import { getRecordingSignedUrl } from '@/lib/storage/recording-storage';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeRecording(recordingSessionId: string) {
  // 1. Get recording session
  const session = await prisma.recordingSession.findUnique({
    where: { id: recordingSessionId },
  });
  if (!session?.audioStoragePath) {
    return { success: false, error: 'No audio file found' };
  }

  // 2. Download audio from Supabase via signed URL
  const signedUrl = await getRecordingSignedUrl(session.audioStoragePath);
  const audioResponse = await fetch(signedUrl);
  const audioBuffer = await audioResponse.arrayBuffer();
  const audioFile = new File(
    [audioBuffer],
    `${recordingSessionId}.webm`,
    { type: 'audio/webm' }
  );

  // 3. Call OpenAI transcription
  const transcription = await openai.audio.transcriptions.create({
    model: 'gpt-4o-transcribe-diarize',
    file: audioFile,
    language: 'ja',
    response_format: 'diarized_json',
    chunking_strategy: 'auto',
  });

  // 4. Store segments in database
  // The diarized_json response has speakers array with labeled segments
  const segments = transcription.speakers?.map((segment, index) => ({
    recordingId: recordingSessionId,
    segmentIndex: index,
    speakerLabel: segment.speaker || null,
    content: segment.text,
    startMs: Math.round(segment.start * 1000),
    endMs: Math.round(segment.end * 1000),
    language: 'ja',
  })) ?? [];

  await prisma.transcriptionSegment.createMany({ data: segments });

  // 5. Update session status
  await prisma.recordingSession.update({
    where: { id: recordingSessionId },
    data: { status: 'COMPLETED' },
  });

  return { success: true, segmentCount: segments.length };
}
```

### MIME Type Detection Utility
```typescript
// Source: MDN MediaRecorder.isTypeSupported()
export function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  throw new Error('No supported audio MIME type found');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| whisper-1 with verbose_json | gpt-4o-transcribe-diarize | 2025 | Built-in speaker labels, no need to manually diarize. Use `diarized_json` response format |
| Manual speaker diarization (pyannote/external) | gpt-4o-transcribe-diarize | 2025 | Single API call handles transcription + diarization |
| getUserMedia + ScriptProcessorNode | getUserMedia + AudioWorklet / AnalyserNode | 2022+ | ScriptProcessorNode is deprecated; AnalyserNode is the correct choice for visualization (no processing needed) |
| Supabase standard upload (6MB limit) | Supabase resumable uploads (TUS protocol) | Available | Standard upload works for most recordings under 6MB; for larger files use TUS or route through API |

**Deprecated/outdated:**
- **ScriptProcessorNode:** Deprecated in favor of AudioWorklet. Not needed here since AnalyserNode suffices for visualization.
- **whisper-1 for new projects:** Still works, but gpt-4o-transcribe models are recommended. whisper-1 is the only model supporting `verbose_json` with `timestamp_granularities` however.

## Model Selection Decision

| Model | Segments | Speaker Labels | Japanese | Price | Recommendation |
|-------|----------|----------------|----------|-------|----------------|
| gpt-4o-transcribe-diarize | Yes (via diarized_json) | Yes (automatic) | Yes | $0.006/min | **Use this** -- speaker labels are a success criterion |
| gpt-4o-transcribe | No segments in response | No | Yes | $0.006/min | Good if no speaker labels needed |
| gpt-4o-mini-transcribe | No segments | No | Yes | $0.003/min | Budget option, no segments |
| whisper-1 | Yes (verbose_json) | No | Yes | $0.006/min | Legacy, use only if diarize model unavailable |

**Decision: Use `gpt-4o-transcribe-diarize`** because:
1. Success criteria explicitly require speaker labels
2. Same price as whisper-1
3. Built-in chunking for long audio
4. One API call instead of transcription + separate diarization

**Fallback:** If `gpt-4o-transcribe-diarize` response format doesn't meet needs (e.g., missing fine-grained timestamps), fall back to `whisper-1` with `verbose_json` and `timestamp_granularities: ["segment"]`. Speaker labels would then need to be hardcoded or omitted.

## Existing Infrastructure (Phase 3)

Phase 3 built significant infrastructure that Phase 4 MUST use (not rebuild):

| Asset | Location | What It Does |
|-------|----------|-------------|
| RecordingSession model | prisma/schema.prisma | Full model with status, audioStoragePath, durationSeconds, relations |
| TranscriptionSegment model | prisma/schema.prisma | segmentIndex, speakerLabel, content, startMs, endMs, language |
| RecordingStatus enum | prisma/schema.prisma | RECORDING, PAUSED, COMPLETED, PROCESSING, FAILED |
| recording.service.ts | src/lib/services/ | CRUD for RecordingSession with Result<T> pattern |
| recording-storage.ts | src/lib/storage/ | uploadRecording, getRecordingSignedUrl, deleteRecording |
| Upload API route | app/api/admin/recordings/upload/route.ts | FormData upload with auth, type/size validation, stores path |
| Zod schemas | src/lib/validations/karute.ts | createRecordingSessionSchema, updateRecordingSessionSchema |
| Server actions | app/actions/karute.ts | createRecordingSessionAction, updateRecordingSessionAction, deleteRecordingSessionAction |

## Environment Variables Needed

```
OPENAI_API_KEY=sk-...     # New: required for transcription
```

The Supabase variables (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are already configured.

## Open Questions

1. **Supabase Storage upload size path**
   - What we know: The upload API route allows 100MB. Standard Supabase upload limit is 6MB for client-side.
   - What's unclear: Whether the server-side upload via service role key bypasses the 6MB client limit (it should).
   - Recommendation: The existing route uploads server-side with the service role key, which should handle larger files. Test with a real recording. If files exceed limits, switch to TUS resumable uploads.

2. **gpt-4o-transcribe-diarize response schema**
   - What we know: Returns `diarized_json` with speaker segments including start/end times.
   - What's unclear: The exact response JSON structure (field names like `speakers` vs `segments`).
   - Recommendation: Test with a sample audio file during implementation and adapt parsing. The openai SDK types should document this.

3. **Recording session UX location**
   - What we know: PROJECT.md mentions "Appointment view at `/{locale}/appointment/{id}`" with recording capability.
   - What's unclear: Whether Phase 4 should build the full appointment view or just the recording components.
   - Recommendation: Build recording components as standalone, composable pieces. The appointment view integration can happen in a later phase. For Phase 4, a simple test/demo page or integration into the existing dashboard is sufficient to prove the recording pipeline works.

## Sources

### Primary (HIGH confidence)
- OpenAI API docs (speech-to-text guide) -- models, file limits, response formats
- MDN Web API docs -- MediaRecorder API, Web Audio API, AnalyserNode
- Existing codebase -- recording.service.ts, recording-storage.ts, karute.ts validations, upload route

### Secondary (MEDIUM confidence)
- OpenAI community forums -- gpt-4o-transcribe-diarize chunking_strategy requirement, diarized_json format
- Supabase docs -- upload size limits, resumable uploads via TUS protocol
- Chrome developer blog -- MediaRecorder WebM duration metadata issue

### Tertiary (LOW confidence)
- gpt-4o-transcribe-diarize exact response schema (needs validation during implementation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- MediaRecorder and Web Audio APIs are stable, well-documented browser APIs. OpenAI SDK is straightforward.
- Architecture: HIGH -- Phase 3 infrastructure is already built and reviewed. Pattern follows existing codebase conventions.
- Pitfalls: HIGH -- All pitfalls are well-documented in MDN docs, OpenAI community forums, and browser compatibility notes.
- Transcription model choice: MEDIUM -- gpt-4o-transcribe-diarize is relatively new; exact response format needs validation.

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (30 days -- browser APIs are stable, OpenAI models may evolve)
