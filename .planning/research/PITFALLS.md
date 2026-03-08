# Domain Pitfalls: AI-Powered Karte (Electronic Medical Records)

**Domain:** Live transcription, AI recording, and treatment records for Japanese wellness businesses
**Researched:** 2026-03-07
**Stack Context:** Next.js 15 + Supabase + Prisma + existing SYNQ booking app
**Confidence:** MEDIUM-HIGH (verified across multiple sources; Japan-specific wellness regulations have LOW confidence due to limited English-language sources)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, regulatory violations, or major user-facing failures.

---

### Pitfall 1: Mobile Safari Audio Recording Format Incompatibility

**What goes wrong:**
Audio recording works on desktop Chrome during development but fails silently or produces unusable files on iOS Safari -- the primary device practitioners will use (tablets/phones during treatments). iPhone Safari produces `audio/webm;codecs=opus` while other browsers may produce different formats. Transcription APIs reject the audio with encoding errors, or the audio plays back garbled.

**Why it happens:**
- Developers test exclusively on desktop Chrome
- Assuming `MediaRecorder` produces the same format everywhere
- Hardcoding MIME types like `audio/webm` or `audio/wav`
- Not checking `MediaRecorder.isTypeSupported()` at runtime
- Safari has historically lagged on MediaRecorder support and has platform-specific quirks

**Consequences:**
- Complete failure of core recording feature on the primary target device (iPad/iPhone)
- Audio files that can't be transcribed, wasting API costs
- Users lose trust after recording a full treatment session only to find it didn't work
- Silent failures where recording appears to work but produces empty or corrupted data

**Prevention:**

1. **Always probe supported formats at runtime:**
```typescript
const PREFERRED_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

function getSupportedMimeType(): string {
  for (const type of PREFERRED_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  throw new Error('No supported audio MIME type found');
}
```

2. **Server-side format normalization:** Convert all uploaded audio to a single format (e.g., WAV or MP3) before sending to transcription APIs. Use ffmpeg/ffprobe on the server to handle any input format.

3. **Test on real iOS devices from day one.** Simulators don't fully replicate MediaRecorder behavior. Budget for BrowserStack or physical device testing.

4. **Store the original MIME type with the recording** so the server knows how to decode it.

**Detection:** Recording works on Chrome desktop but fails on iOS Safari. Audio files from different browsers have different extensions or sizes for the same duration.

**Phase to address:** Phase 1 (Audio Recording foundation). This must work before anything else.

**Confidence:** HIGH -- well-documented across MDN, WebKit blog, and developer forums.

**Sources:**
- [MediaRecorder Safari support](https://www.buildwithmatija.com/blog/iphone-safari-mediarecorder-audio-recording-transcription)
- [Safari ALAC/PCM codec support](https://blog.addpipe.com/record-high-quality-audio-in-safari-with-alac-and-pcm-support-via-mediarecorder/)
- [Cross-browser compatible recording](https://media-codings.com/articles/recording-cross-browser-compatible-media)
- [Can I Use MediaRecorder](https://caniuse.com/mediarecorder)

---

### Pitfall 2: iOS Safari getUserMedia Permission and Audio Routing Quirks

**What goes wrong:**
Safari repeatedly prompts for microphone permission even after the user has already granted it, interrupting treatment sessions. Additionally, when `getUserMedia()` activates the microphone, iOS forcibly routes audio output to the built-in speakers instead of connected Bluetooth headphones, surprising users.

**Why it happens:**
- Safari's permissions are the least persistent among browsers -- they can reset between page navigations in SPAs, when the hash changes, or when the app is reopened
- iOS enforces autoplay policies that require explicit user gesture to resume `AudioContext`
- `getUserMedia()` triggers iOS audio routing changes that developers can't control
- HTTPS is strictly required (no HTTP, no `file://`)

**Consequences:**
- Practitioners interrupted mid-treatment by permission dialogs
- Audio routing to speakers causes privacy concerns (client can hear playback)
- Recording fails silently if AudioContext isn't in "running" state
- Users abandon the feature after frustrating permission experiences

**Prevention:**

1. **Request permissions early with clear UX:** Show a "prepare recording" button before the session starts. Don't lazy-request mid-treatment.

2. **Resume AudioContext on user gesture:**
```typescript
const audioContext = new AudioContext();
// AudioContext starts in 'suspended' state on iOS
startButton.addEventListener('click', async () => {
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  // Now start recording
});
```

3. **Warn users about audio routing:** If Bluetooth headphones are detected, show a notice that audio may switch to speakers during recording.

4. **Maintain a single long-lived MediaStream** rather than repeatedly calling `getUserMedia()` per recording chunk.

5. **Add `playsinline` and `muted` attributes** to any audio/video elements to avoid autoplay policy blocks.

**Detection:** Permission prompts appearing repeatedly on iOS. Users reporting audio suddenly playing from speakers. Recording failing without error messages.

**Phase to address:** Phase 1 (Audio Recording foundation).

**Confidence:** HIGH -- confirmed via WebKit bug tracker, Apple Developer Forums, and MDN documentation.

**Sources:**
- [getUserMedia recurring permission prompts](https://bugs.webkit.org/show_bug.cgi?id=215884)
- [iOS Safari getUserMedia guide 2026](https://blog.addpipe.com/getusermedia-getting-started/)
- [iOS audio routing issue](https://medium.com/@python-javascript-php-html-css/ios-safari-forces-audio-output-to-speakers-when-using-getusermedia-2615196be6fe)

---

### Pitfall 3: WebSocket/SSE Incompatibility with Vercel Serverless Deployment

**What goes wrong:**
Developers build real-time streaming transcription with WebSockets, then discover Vercel's serverless functions don't support WebSocket connections. Or they use SSE but the route handler buffers the entire response before sending, resulting in no streaming at all.

**Why it happens:**
- Serverless functions are ephemeral -- they spin up and down, incompatible with persistent WebSocket connections
- Next.js App Router route handlers don't expose the raw `res` object needed for WebSocket upgrade
- SSE in route handlers has a subtle bug: if you `await` an async loop before returning the Response, Next.js buffers everything until completion
- Edge Runtime has a 300-second execution limit and must begin sending a response within 25 seconds

**Consequences:**
- Complete streaming failure on Vercel deployment
- Transcription results arrive only after recording ends (defeats the purpose of "live" transcription)
- Timeouts kill long recording sessions (treatments can be 60-90 minutes)
- Major architecture rewrite needed if discovered late

**Prevention:**

1. **Use SSE, not WebSockets, for Vercel deployment.** SSE works with serverless functions when implemented correctly.

2. **Return the Response immediately, stream after:**
```typescript
// WRONG - buffers everything
export async function GET() {
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of transcribe()) {
        controller.enqueue(chunk); // Buffered!
      }
      controller.close();
    }
  });
  return new Response(stream, { headers: sseHeaders });
}

// RIGHT - returns immediately, streams incrementally
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      // Non-async start, return Response immediately
      processTranscription(controller); // fire and forget
    }
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
```

3. **Set `export const dynamic = 'force-dynamic'`** on SSE route handlers to prevent Vercel caching.

4. **For sessions longer than 5 minutes:** Use chunked architecture -- client sends audio in segments, each gets transcribed independently, results are assembled client-side. Don't maintain a single 60-minute SSE connection.

5. **Consider a separate WebSocket server** (on Fly.io, Railway, etc.) if true bidirectional communication is needed. Proxy through SYNQ's domain for CORS simplicity.

**Detection:** Streaming works in `next dev` but breaks on Vercel deployment. Transcription results appear all at once instead of incrementally.

**Phase to address:** Phase 2 (Streaming Transcription). Must be architecture-decided before implementation begins.

**Confidence:** HIGH -- well-documented Vercel limitation, confirmed in Next.js GitHub discussions.

**Sources:**
- [Next.js WebSocket discussion #58698](https://github.com/vercel/next.js/discussions/58698)
- [Fixing slow SSE in Next.js](https://medium.com/@oyetoketoby80/fixing-slow-sse-server-sent-events-streaming-in-next-js-and-vercel-99f42fbdb996)
- [Vercel Edge Runtime limits](https://vercel.com/docs/functions/runtimes/edge)
- [Vercel streaming for serverless](https://vercel.com/blog/streaming-for-serverless-node-js-and-edge-runtimes-with-vercel-functions)

---

### Pitfall 4: Japan APPI Compliance for Treatment Records (Sensitive Personal Information)

**What goes wrong:**
Treatment records containing health/body condition data are classified as "Special Care-Required Personal Information" (要配慮個人情報) under Japan's APPI. Handling them like regular booking data -- without explicit consent workflows, proper security measures, or data handling policies -- creates regulatory risk and potential penalties.

**Why it happens:**
- Developers treat treatment notes the same as booking metadata
- Confusion about whether "wellness" (non-medical) data falls under APPI's medical provisions
- Audio recordings of treatment sessions capture health discussions, automatically elevating data sensitivity
- No awareness of APPI's explicit consent requirements for sensitive data acquisition

**Consequences:**
- Administrative penalties under APPI (upcoming 2026-2027 reforms introduce monetary surcharges)
- Loss of business client trust (salons won't adopt a tool that creates liability)
- Mandatory breach notification requirements if data is leaked
- Cannot use opt-out mechanisms for sharing sensitive data with third parties (e.g., AI providers)

**Prevention:**

1. **Explicit consent flow before first recording:** Users (both practitioners and clients) must explicitly consent to recording and AI processing of treatment-related information. This is not optional -- APPI prohibits acquisition of sensitive personal information without prior consent.

2. **Data classification in the schema:**
```
- Booking data: regular personal information (standard APPI rules)
- Treatment notes/karte: Special Care-Required (heightened rules)
- Audio recordings: Special Care-Required (contains health discussions)
- AI-generated summaries: Special Care-Required (derived from health data)
```

3. **Implement security safeguards required by APPI:**
   - Organizational: assign a data handling officer, establish handling rules
   - Technical: encrypt at rest and in transit, access controls per practitioner
   - Physical: restrict which devices can access karte data
   - Personnel: train business owners on data handling obligations

4. **Restrict cross-border data transfer:** If using US-based AI APIs (OpenAI, Deepgram), you're transferring Japanese sensitive personal information cross-border. APPI requires either: (a) consent from the data subject, (b) the recipient country has equivalent protections, or (c) the recipient has an appropriate data handling framework. Document this in your privacy policy.

5. **Data retention policies:** Implement configurable retention periods. Don't store audio recordings indefinitely. Allow businesses to set their own retention policies.

6. **Audit logging:** Log who accessed what karte data and when. APPI requires you to be able to respond to data subject access requests.

**Detection:** No consent flow exists before recording. Audio files stored without encryption. No privacy policy addressing AI processing of health data. No data retention configuration.

**Phase to address:** Phase 1 (before any data collection begins). Privacy architecture must be designed upfront.

**Confidence:** MEDIUM -- APPI requirements are well-documented, but the specific classification of wellness (non-medical) treatment records under "Special Care-Required" categories is a gray area. Seitai, massage, and beauty treatments are not "medical" per se, but recordings discussing body conditions likely qualify. Recommend legal review.

**Sources:**
- [APPI 2025-2026 Japan overview](https://iclg.com/practice-areas/data-protection-laws-and-regulations/japan)
- [Japan APPI Compliance Guide 2026](https://secureprivacy.ai/blog/appi-japan-privacy-compliance)
- [Data Protection & Privacy 2025 Japan](https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2025/japan/trends-and-developments)
- [Digital Health Laws Japan 2025-2026](https://iclg.com/practice-areas/digital-health-laws-and-regulations/japan)

---

### Pitfall 5: Whisper API Has No Native Streaming -- Fake "Real-Time" Causes Terrible UX

**What goes wrong:**
Developers assume OpenAI's Whisper API supports real-time streaming transcription. It doesn't. Whisper is batch-only, processing uploaded audio files with a 25MB limit (~30 minutes). Attempting to simulate streaming by sending small chunks produces fragmented, context-less transcriptions with high error rates, especially for Japanese.

**Why it happens:**
- Confusing OpenAI's Realtime API (voice conversation) with Whisper (transcription)
- Marketing materials blur the line between "fast" and "real-time"
- Whisper processes audio in 30-second internal chunks, losing context between API calls
- Japanese transcription is particularly affected because context is essential for correct kanji selection

**Consequences:**
- Transcription quality degrades severely when audio is chunked into small segments
- Japanese homophones resolved incorrectly without surrounding context (e.g., 橋/箸/端 all pronounced "hashi")
- Latency of 2-5 seconds per chunk, creating a choppy "live" experience
- Users see garbled text appearing intermittently instead of smooth streaming

**Prevention:**

1. **Use Deepgram for streaming transcription.** Deepgram Nova models support true WebSocket-based streaming with sub-300ms latency and better multilingual support. Price is competitive ($4.30/1000 min vs Whisper's $6.00/1000 min).

2. **If using OpenAI, use GPT-4o Transcribe** (not legacy Whisper) which offers better accuracy at the same price, or GPT-4o Mini Transcribe at $3.00/1000 min for cost-sensitive use.

3. **Hybrid architecture:** Use streaming provider (Deepgram) for live display, then run a final Whisper pass on the complete audio for a polished transcript. Display the streaming version as "draft" and the final version as "complete."

4. **If forced to chunk Whisper:** Overlap chunks by 5-10 seconds and deduplicate on the server. Send the previous chunk's last sentence as a "prompt" parameter for context continuity.

5. **For Japanese specifically:** Always set `language: 'ja'` explicitly. Don't rely on auto-detection, which wastes the first few seconds detecting language and may default to English for ambiguous audio.

**Detection:** Transcription text appears in large blocks with delays instead of word-by-word. Japanese transcription has frequent wrong kanji. Users describe the feature as "slow" or "broken."

**Phase to address:** Phase 2 (Streaming Transcription). Provider selection is an architecture decision.

**Confidence:** HIGH -- Whisper's batch-only nature is confirmed in OpenAI's documentation. Deepgram comparison data from their benchmarks (inherent bias, but latency claims are independently verified).

**Sources:**
- [Whisper vs Deepgram comparison](https://deepgram.com/learn/whisper-vs-deepgram)
- [OpenAI pricing](https://platform.openai.com/docs/pricing)
- [Why enterprises are moving to streaming](https://deepgram.com/learn/why-enterprises-are-moving-to-streaming-and-why-whisper-can-t-keep-up)
- [Whisper Japanese transcription issues](https://github.com/openai/whisper/discussions/2151)

---

## Moderate Pitfalls

Mistakes that cause significant rework, performance issues, or user dissatisfaction.

---

### Pitfall 6: Audio File Size Explosion Consuming Supabase Storage

**What goes wrong:**
A 60-minute treatment session recorded as uncompressed WAV at 44.1kHz/16-bit produces ~300MB. Even compressed, a busy salon with 10 practitioners doing 8 sessions/day generates 2.4GB-24GB daily. Storage costs explode within weeks, and Supabase's free tier (1GB storage) fills immediately.

**Why it happens:**
- Recording in high-quality uncompressed format "just in case"
- No audio compression before upload
- Storing both the original audio AND the transcription without a cleanup strategy
- Not setting per-bucket file size limits in Supabase
- Supabase standard uploads are designed for files under 6MB

**Prevention:**

1. **Compress on the client side** before upload. Use Opus codec (via MediaRecorder) at 32kbps for voice -- produces ~15MB per hour with excellent quality for speech.

2. **Chunked upload for files over 6MB:** Use Supabase's resumable upload (TUS protocol) for reliability on mobile networks.

3. **Implement a retention lifecycle:**
   - Recording → Transcription complete → Keep audio for 7-30 days → Delete audio, keep transcript
   - Make retention configurable per business

4. **Set Supabase bucket limits:**
```sql
-- Create bucket with file size limit
INSERT INTO storage.buckets (id, name, file_size_limit)
VALUES ('karte-audio', 'karte-audio', 52428800); -- 50MB max per file
```

5. **Compress server-side as a fallback:** Run ffmpeg to convert any uploaded audio to Opus/OGG before permanent storage.

6. **Budget calculation:** At Opus 32kbps, 1 hour = ~14MB. Supabase Pro plan ($25/mo) includes 100GB. That's ~7,000 hours of audio. For most small wellness businesses, this is sufficient.

**Detection:** Supabase storage usage growing much faster than expected. Upload failures on mobile. Storage costs exceeding budget within the first month.

**Phase to address:** Phase 1 (Audio Recording). Storage strategy must be decided with recording implementation.

**Confidence:** HIGH -- file size calculations are deterministic; Supabase limits are documented.

**Sources:**
- [Supabase storage file limits](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Supabase storage scaling](https://supabase.com/docs/guides/storage/production/scaling)

---

### Pitfall 7: Japanese Transcription Accuracy -- Domain-Specific Vocabulary Fails

**What goes wrong:**
General-purpose transcription models consistently mis-transcribe wellness/treatment-specific Japanese terminology. Terms like 筋膜リリース (kinmaku release / myofascial release), 骨盤矯正 (kotsuban kyousei / pelvic correction), or チャクラ (chakra) are transcribed as phonetically similar but meaningless words.

**Why it happens:**
- Whisper and Deepgram are trained on general conversation, not wellness/medical terminology
- Japanese has many homophones that require domain context to resolve correctly
- Practitioner speech during treatments is often mumbled, fast, or spoken while working with hands
- Background music/ambient sounds common in wellness settings degrade accuracy

**Consequences:**
- Karte records contain meaningless or incorrect terminology
- Practitioners must manually correct every transcript, negating the time savings
- Users lose trust in AI features and abandon them
- Incorrect treatment records could lead to wrong follow-up treatments

**Prevention:**

1. **Build a domain-specific vocabulary/glossary:** Create a curated list of wellness terms per business type (seitai, massage, hair salon, yoga). Pass this as context/prompt to the transcription API.

2. **Post-processing correction layer:** After transcription, run a text replacement pass using the domain glossary to fix common mistranscriptions.

3. **Per-business-type prompt templates:**
```typescript
const BUSINESS_PROMPTS: Record<BusinessType, string> = {
  seitai: '整体施術の記録。用語：筋膜リリース、骨盤矯正、姿勢改善、可動域...',
  massage: 'マッサージ施術の記録。用語：指圧、リンパ、もみほぐし...',
  hairSalon: '美容室カルテ。用語：カラーリング、トリートメント、パーマ...',
};
```

4. **Allow practitioners to add custom vocabulary** to their account settings. Feed these into transcription prompts.

5. **Show confidence indicators** on transcribed text. Highlight low-confidence segments so practitioners know what to review.

6. **Set user expectations clearly:** Position as "AI-assisted" not "AI-automated." The AI drafts, the practitioner reviews and approves.

**Detection:** Practitioners reporting frequent transcription errors. Domain-specific terms consistently wrong. Users spending more time correcting transcripts than typing from scratch.

**Phase to address:** Phase 2 (Transcription) and Phase 3 (Templates). Vocabulary system is iterative.

**Confidence:** MEDIUM -- Japanese transcription challenges are well-documented, but the specific accuracy for wellness terminology hasn't been benchmarked. Recommend building a test corpus early.

**Sources:**
- [Whisper Japanese transcription discussion](https://github.com/openai/whisper/discussions/2151)
- [Speech to text accuracy guide 2025](https://medium.com/@isabelleradcliffe/speech-to-text-accuracy-my-2025-guide-to-getting-the-most-from-voice-transcription-99fc9e8e9228)

---

### Pitfall 8: AI API Cost Runaway -- No Rate Limits or Usage Tracking

**What goes wrong:**
A single practitioner recording 8 hours/day of audio, sending each to transcription, then translation, then summarization, then auto-tagging generates $5-15/day in API costs per user. A salon with 5 practitioners could cost $75/day ($2,250/month) before the business even pays for the subscription. A bug or retry loop can 10x this overnight.

**Why it happens:**
- No per-user or per-business usage caps
- Retry logic without exponential backoff sends the same audio multiple times
- Translation running on every sentence in real-time instead of batched
- No caching of repeated translations (common wellness phrases appear in every session)
- Running multiple AI providers in parallel "for comparison" during development

**Consequences:**
- API costs exceed subscription revenue
- A single rogue user or bug can drain the monthly budget
- No visibility into which features consume the most API spend
- Unable to offer competitive pricing because cost floor is too high

**Prevention:**

1. **Implement usage metering from day one:**
```typescript
interface UsageRecord {
  businessId: string;
  feature: 'transcription' | 'translation' | 'summarization' | 'tagging';
  inputTokens: number;
  outputTokens: number;
  audioDurationSeconds: number;
  cost: number;
  timestamp: Date;
}
```

2. **Set hard limits per business tier:**
   - Free: 30 min recording/month
   - Basic: 10 hours/month
   - Pro: 50 hours/month
   - Enterprise: custom

3. **Cache aggressively:**
   - Common phrases in translation (greetings, session openers/closers)
   - Template-based summaries (only diff the unique content)
   - Tag suggestions based on previous similar sessions

4. **Batch operations:** Don't translate sentence-by-sentence in real-time. Translate the final transcript in one API call.

5. **Use the cheapest model that works:** GPT-4o Mini for tagging and summarization. Reserve expensive models for translation quality.

6. **Alert on anomalies:** If a single business exceeds 3x their historical daily usage, pause and notify.

**Detection:** Monthly AI API bill exceeding projections. Certain businesses consuming disproportionate resources. Retry loops in error logs.

**Phase to address:** Phase 2 (Transcription). Usage metering should be built alongside the first AI integration.

**Confidence:** HIGH -- API pricing is published; cost calculations are straightforward.

---

### Pitfall 9: Waveform Visualization Janking on Mobile Devices

**What goes wrong:**
Real-time waveform visualization using Canvas and `requestAnimationFrame` consumes significant CPU/GPU resources. On older iPads and phones (common in salons), this causes the UI to become unresponsive, recording to stutter, and battery to drain rapidly during hour-long sessions.

**Why it happens:**
- Drawing every audio frame to Canvas on the main thread
- Using `AnalyserNode.getByteTimeDomainData()` at 60fps when 15fps would suffice
- Canvas resolution not accounting for device pixel ratio (blurry on Retina, or rendering at 2x-3x resolution unnecessarily)
- Not pausing visualization when the app is backgrounded (wasting battery)

**Prevention:**

1. **Throttle visualization to 15-20fps** for waveforms. Human eyes can't perceive waveform differences above ~20fps.

2. **Use OffscreenCanvas in a Web Worker** if available (not supported in Safari as of 2025 -- degrade gracefully to throttled main thread Canvas).

3. **Pause rendering when not visible:**
```typescript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(animationId);
  } else {
    startVisualization();
  }
});
```

4. **Simplify the visualization on low-end devices.** Detect performance issues and fall back to a simple pulsing indicator instead of a full waveform.

5. **Pre-calculate waveform data for playback.** Don't re-analyze audio in real-time during playback. Generate waveform data once and render from cache.

**Detection:** UI stuttering during recording on iPad. Battery drain complaints. Recording audio has gaps or glitches.

**Phase to address:** Phase 1 (Audio Recording UI). Waveform is a UX feature, not a core feature -- can be simplified.

**Confidence:** HIGH -- Canvas performance on mobile is well-understood.

**Sources:**
- [MDN Web Audio Visualizations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API)

---

### Pitfall 10: Translation Pipeline Latency Making "Live" Translation Unusable

**What goes wrong:**
The pipeline of audio → transcription → translation creates compounding latency. If transcription takes 1-3 seconds and translation takes 0.5-1 second per segment, the translated text lags 2-4 seconds behind speech. For a "live" feature, this feels broken.

**Why it happens:**
- Serial pipeline: wait for transcription to complete, then send to translation
- Translating sentence-by-sentence instead of streaming partial results
- Using full LLM (GPT-4) for translation when a specialized service (DeepL) would be faster
- Not distinguishing between "live preview" quality and "final" quality

**Prevention:**

1. **Use DeepL for real-time translation, not LLMs.** DeepL has lower latency (~200ms) and better Japanese-English quality than GPT for straightforward translation. Reserve LLMs for context-aware medical/wellness terminology translation in the final pass.

2. **Parallel, not serial:** Start translating partial transcription segments as soon as they arrive, don't wait for complete sentences.

3. **Two-tier translation:**
   - **Live tier:** Fast, good-enough translation displayed during session (DeepL API)
   - **Final tier:** High-quality, context-aware translation generated post-session (LLM with full transcript context)

4. **Set UX expectations:** Label live translation as "draft" with a visual indicator. Show polished translation after session ends.

5. **Cache common phrases:** Wellness sessions have repetitive patterns. Pre-translate common phrases and template language.

**Detection:** Users complaining translation is "always behind." Visible delay between Japanese speech and English text appearance.

**Phase to address:** Phase 3 (Translation). Comes after transcription is stable.

**Confidence:** MEDIUM -- latency estimates based on published API performance. Real-world performance depends on network conditions in Japanese salons.

---

## Minor Pitfalls

Mistakes that cause friction, tech debt, or minor user experience issues.

---

### Pitfall 11: Over-Engineering Multi-Provider AI Abstraction

**What goes wrong:**
Developers build a complex provider abstraction layer before knowing which providers will actually be used. The abstraction doesn't match real provider differences (streaming vs. batch, different auth models, different response formats), resulting in a leaky abstraction that's harder to maintain than direct integrations.

**Prevention:**

1. **Start with one provider per function.** Deepgram for transcription, DeepL for translation, OpenAI for summarization.

2. **Abstract only when you actually add a second provider.** The abstraction will be better because you'll know the real differences.

3. **Use a simple strategy pattern, not a framework:**
```typescript
interface TranscriptionProvider {
  transcribe(audio: Buffer, language: string): Promise<TranscriptionResult>;
}
// That's it. Don't over-specify the interface.
```

4. **Don't abstract away provider-specific features** (Deepgram's diarization, OpenAI's prompt parameter). These are competitive advantages, not implementation details.

**Phase to address:** Ongoing. Resist the urge to abstract prematurely.

**Confidence:** HIGH -- standard software engineering wisdom.

---

### Pitfall 12: Auto-Tagging Accuracy Destroying User Trust

**What goes wrong:**
AI auto-tagging suggests irrelevant or incorrect tags for treatment records. A seitai session gets tagged "hair coloring" because the client mentioned their hairstylist. Users learn to ignore tags entirely, making the feature useless.

**Prevention:**

1. **Business-type-scoped tag vocabularies.** A seitai business should only see seitai-relevant tags, never hair salon tags.

2. **Suggest, don't apply.** Show tags as suggestions that practitioners confirm or dismiss. Track acceptance rates.

3. **Feedback loop:** When practitioners reject tags, use that signal to improve. If a tag is rejected >50% of the time for a business type, remove it from suggestions.

4. **Start with rule-based tagging** (keyword matching against domain glossary) before introducing ML-based tagging. Rules are predictable and debuggable.

**Phase to address:** Phase 4 (Auto-tagging). Comes after transcription quality is proven.

**Confidence:** MEDIUM -- general AI UX patterns, not specific to this domain.

---

### Pitfall 13: i18n for AI-Generated Content is Fundamentally Different from Static i18n

**What goes wrong:**
Developers try to use the existing i18n system (next-intl or similar) for AI-generated content. But AI-generated karte summaries, tags, and translations aren't static strings with known keys -- they're dynamic content that needs to exist in multiple languages simultaneously.

**Prevention:**

1. **Store AI-generated content with language metadata:**
```typescript
interface KarteContent {
  originalLanguage: 'ja' | 'en';
  content: Record<string, string>; // { ja: '...', en: '...' }
  generatedAt: Date;
  model: string;
}
```

2. **Don't re-translate on every page load.** Generate translations once and store them. Allow manual re-translation if needed.

3. **The karte UI must support mixed-language display** (original Japanese transcription alongside English translation), not just single-language switching.

4. **AI-generated content should NOT go through the i18n key system.** Keep static UI strings and dynamic AI content in completely separate rendering paths.

**Phase to address:** Phase 3 (Translation/i18n). Design the data model early.

**Confidence:** HIGH -- architectural pattern, not technology-specific.

---

### Pitfall 14: Recording State Lost on Accidental Navigation or App Background

**What goes wrong:**
A practitioner accidentally swipes back, taps a notification, or the iPad auto-locks during a 60-minute recording. The entire recording is lost because it was only in browser memory.

**Prevention:**

1. **Periodic chunk saves:** Save audio chunks every 30-60 seconds to Supabase storage. If the session is interrupted, only the last chunk is lost.

2. **`beforeunload` warning:**
```typescript
window.addEventListener('beforeunload', (e) => {
  if (isRecording) {
    e.preventDefault();
    e.returnValue = '録音中です。ページを離れると録音が失われます。';
  }
});
```

3. **Wake lock API** to prevent screen from auto-locking during recording:
```typescript
if ('wakeLock' in navigator) {
  const wakeLock = await navigator.wakeLock.request('screen');
}
```

4. **Recovery mechanism:** On next page load, check for unsaved chunks and offer to recover the partial recording.

5. **Note:** Wake Lock API is supported in Safari 16.4+ (iOS 16.4+). For older devices, display a prominent "keep screen on" reminder.

**Phase to address:** Phase 1 (Audio Recording). Critical for the treatment session use case.

**Confidence:** HIGH -- standard browser behavior; Wake Lock API support verified on caniuse.com.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Audio Recording | iOS Safari format/permission issues (Pitfalls 1, 2) | Test on real iOS devices from day 1. Probe formats at runtime. |
| Audio Recording | Recording lost on navigation (Pitfall 14) | Periodic chunk saves, wake lock, beforeunload warning. |
| Audio Recording | Storage costs (Pitfall 6) | Compress with Opus. Set retention policies. Budget early. |
| Streaming Transcription | No real streaming from Whisper (Pitfall 5) | Use Deepgram or hybrid approach. Set architecture early. |
| Streaming Transcription | SSE buffering on Vercel (Pitfall 3) | Return Response immediately. Use chunked architecture. |
| Streaming Transcription | Japanese accuracy (Pitfall 7) | Domain glossaries. Confidence indicators. "AI-assisted" framing. |
| Translation | Compounding latency (Pitfall 10) | DeepL for live, LLM for final. Parallel processing. |
| Translation | i18n architecture mismatch (Pitfall 13) | Separate dynamic content from static i18n. Store multilingual. |
| Auto-tagging | User trust (Pitfall 12) | Suggest don't apply. Business-scoped vocabularies. |
| AI Integration | Cost runaway (Pitfall 8) | Usage metering from day 1. Hard limits per tier. |
| AI Integration | Over-engineering abstraction (Pitfall 11) | Start with direct integrations. Abstract when needed. |
| Privacy/Compliance | APPI violations (Pitfall 4) | Consent flows before recording. Classify data sensitivity. Legal review. |
| Waveform UI | Mobile performance (Pitfall 9) | Throttle to 15fps. Degrade gracefully on low-end devices. |

---

## Japan-Specific Considerations Summary

| Area | Requirement | Risk Level | Action |
|------|------------|------------|--------|
| **APPI Sensitive Data** | Treatment/health records require explicit consent for collection | HIGH | Consent flow before any recording |
| **Cross-Border Transfer** | Sending audio/text to US-based AI APIs requires consent or adequacy assessment | HIGH | Privacy policy must disclose; get consent |
| **Data Subject Rights** | Individuals can request disclosure, correction, deletion of their data | MEDIUM | Build data export and deletion tooling |
| **Breach Notification** | Must notify PPC and affected individuals if data leak occurs | HIGH | Incident response plan |
| **Data Retention** | No mandated period for wellness, but must have a defined policy | MEDIUM | Configurable retention per business |
| **Upcoming APPI Reforms** | 2026-2027 reforms adding monetary penalties | MEDIUM | Design for compliance now to avoid retrofitting |
| **Wellness vs Medical** | Gray area -- wellness isn't strictly "medical" but treatment records discussing body conditions likely qualify as sensitive | LOW-MEDIUM | Conservative approach: treat as sensitive. Get legal opinion. |
| **Audio Consent (2-party)** | Japan does not have strict two-party consent for recording, but business ethics and client trust require disclosure | MEDIUM | Visible "recording in progress" indicator for clients |

---

## Pre-Implementation Checklist

Before building Karte features, verify:

- [ ] Real iOS device available for testing (iPad preferred, matching target hardware)
- [ ] Supabase storage bucket configured with file size limits
- [ ] APPI-compliant consent flow designed (even if wireframe)
- [ ] Streaming transcription provider selected (Deepgram recommended over Whisper)
- [ ] Deployment target confirmed (Vercel limitations acknowledged, workarounds planned)
- [ ] AI API cost budget established per business tier
- [ ] Usage metering schema designed
- [ ] Data retention policy defined
- [ ] Audio format normalization strategy chosen (client-side Opus + server-side ffmpeg fallback)
- [ ] Privacy policy updated to disclose AI processing and cross-border data transfer
