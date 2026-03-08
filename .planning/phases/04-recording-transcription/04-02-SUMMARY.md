---
phase: 04-recording-transcription
plan: 02
subsystem: api
tags: [openai, transcription, diarization, prisma, jest]

# Dependency graph
requires:
  - phase: 03-karte-foundation
    provides: RecordingSession model, recording-storage module, recording.service patterns
provides:
  - transcribeRecording service function
  - POST /api/admin/recordings/transcribe endpoint
  - transcription unit tests (5 cases)
affects: [04-recording-transcription]

# Tech tracking
tech-stack:
  added: [openai@6.27.0]
  patterns: [lazy OpenAI client instantiation, diarized_json response parsing]

key-files:
  created:
    - src/lib/services/transcription.service.ts
    - app/api/admin/recordings/transcribe/route.ts
    - src/lib/services/__tests__/transcription.service.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Lazy OpenAI client creation (not module-level) for test/build compatibility"
  - "Defensive parsing of diarized_json response (handle both speakers and segments fields)"
  - "eslint-disable for OpenAI transcription params (SDK types incomplete for diarized model)"

patterns-established:
  - "TranscriptionResult<T> discriminated union matching RecordingResult<T> pattern"
  - "Lazy third-party client instantiation for modules requiring API keys"

# Metrics
duration: 2min
completed: 2026-03-07
---

# Phase 04 Plan 02: Transcription Service & API Summary

**OpenAI gpt-4o-transcribe-diarize integration with speaker-labeled segment storage and admin API endpoint**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-07T20:54:15Z
- **Completed:** 2026-03-07T20:56:27Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- transcribeRecording function downloads audio from Supabase, calls OpenAI with diarization, and stores segments with speaker labels and millisecond timestamps
- POST /api/admin/recordings/transcribe endpoint with admin auth, input validation, and error handling
- 5 unit tests covering success, not found, no audio, API error, and segment mapping verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Install openai SDK and create transcription service** - `6f0b7d6` (feat)
2. **Task 2: Create transcribe API route and unit tests** - `ad05f76` (feat)

## Files Created/Modified
- `src/lib/services/transcription.service.ts` - transcribeRecording function with OpenAI integration and status management
- `app/api/admin/recordings/transcribe/route.ts` - Admin-only POST endpoint triggering transcription
- `src/lib/services/__tests__/transcription.service.test.ts` - 5 unit tests with mocked OpenAI, Prisma, fetch, and Sentry
- `package.json` - Added openai@6.27.0 dependency
- `package-lock.json` - Lock file updated

## Decisions Made
- Lazy OpenAI client creation (not module-level) so module can be imported without OPENAI_API_KEY set
- Defensive parsing of diarized_json response handles both `speakers` and `segments` fields
- Used `as any` type assertion for OpenAI transcription params since SDK types are incomplete for gpt-4o-transcribe-diarize model

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

**External services require manual configuration.** OPENAI_API_KEY environment variable must be set for transcription to work:
- Source: OpenAI Dashboard -> API keys -> Create new secret key
- Add to `.env.local`: `OPENAI_API_KEY=sk-...`

## Next Phase Readiness
- Transcription pipeline ready for end-to-end testing with real audio
- Frontend transcription trigger UI can call POST /api/admin/recordings/transcribe
- Segments stored in TranscriptionSegment table, ready for display in karute UI

## Self-Check: PASSED

- [x] src/lib/services/transcription.service.ts exists
- [x] app/api/admin/recordings/transcribe/route.ts exists
- [x] src/lib/services/__tests__/transcription.service.test.ts exists
- [x] Commit 6f0b7d6 (Task 1) exists
- [x] Commit ad05f76 (Task 2) exists
- [x] All 5 tests pass
- [x] No type errors in transcription files
- [x] openai@6.27.0 installed

---
*Phase: 04-recording-transcription*
*Completed: 2026-03-07*
