---
phase: 03-karte-foundation
plan: 02
subsystem: api
tags: [zod, prisma, sentry, crud, service-layer, validation]

requires:
  - phase: 03-01
    provides: "Prisma schema with KaruteRecord, KaruteEntry, RecordingSession, TranscriptionSegment models and recording-storage module"
provides:
  - "Zod validation schemas for all karute input types"
  - "KaruteRecord CRUD service (create, get, getByCustomer, update, delete)"
  - "KaruteEntry CRUD service (create, update, delete)"
  - "RecordingSession CRUD service (create, get, update, delete)"
  - "KaruteResult<T> and RecordingResult<T> discriminated union types"
affects: [03-03, server-actions, api-routes]

tech-stack:
  added: []
  patterns: ["KaruteResult<T> discriminated union with generic data property", "captureError helper wrapping Sentry.captureException", "Best-effort storage cleanup on cascade delete"]

key-files:
  created:
    - src/lib/validations/karute.ts
    - src/lib/services/karute.service.ts
    - src/lib/services/recording.service.ts
  modified: []

key-decisions:
  - "Generic 'data' property in KaruteResult<T> instead of entity-specific names (handles multiple entity types)"
  - "Best-effort audio cleanup on delete with warn logging (non-blocking per RESEARCH pitfall 4)"
  - "Separate KaruteRecordListItem type for getByCustomer (excludes recording sessions for lighter queries)"

patterns-established:
  - "KaruteResult<T>/RecordingResult<T>: discriminated union with { success, data } or { success, error }"
  - "captureError helper: Sentry.captureException + console.error with structured context"
  - "formatValidationErrors: Zod issues mapped to comma-separated message string"

duration: 3min
completed: 2026-03-07
---

# Phase 03 Plan 02: Karute Service Layer Summary

**Zod validation schemas and CRUD service layer for karute records, entries, and recording sessions with Result<T> returns and Sentry tracking**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-07T20:22:38Z
- **Completed:** 2026-03-07T20:25:38Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments
- Six Zod validation schemas covering create/update for karute records, entries, and recording sessions with exported inferred types
- karute.service.ts with 8 CRUD functions (5 record, 3 entry) returning KaruteResult<T>
- recording.service.ts with 4 CRUD functions returning RecordingResult<T>
- All services follow existing patterns: Zod safeParse validation, Sentry error capture, Result discriminated union

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Zod validation schemas for karute inputs** - `388bf79` (feat)
2. **Task 2: Create karute service with full CRUD operations** - `7b72551` (feat)
3. **Task 3: Create recording service with CRUD operations** - `0ca69e0` (feat)

## Files Created/Modified
- `src/lib/validations/karute.ts` - Six Zod schemas with inferred types for karute records, entries, and recording sessions
- `src/lib/services/karute.service.ts` - 8 CRUD functions for KaruteRecord and KaruteEntry with validation, Sentry tracking, and storage cleanup
- `src/lib/services/recording.service.ts` - 4 CRUD functions for RecordingSession with validation, Sentry tracking, and storage cleanup

## Decisions Made
- Used generic `data` property in KaruteResult<T> (vs booking.service.ts `booking` property) since service handles multiple entity types
- Best-effort audio storage cleanup on record/session deletion with console.warn on failure (non-blocking per RESEARCH pitfall 4)
- Separate lighter include type for getKaruteRecordsByCustomer (omits recordingSessions for list performance)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Service layer complete, ready for server actions and API routes in 03-03
- All CRUD operations validated and type-safe
- Delete functions handle storage cleanup for audio files

---
*Phase: 03-karte-foundation*
*Completed: 2026-03-07*
