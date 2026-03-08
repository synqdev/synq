---
phase: 05-ai-classification-karute-ui
plan: 01
subsystem: api
tags: [openai, gpt-4o, structured-outputs, zod-v4, classification, ai]

# Dependency graph
requires:
  - phase: 03-karte-foundation
    provides: KaruteRecord, KaruteEntry models, karute.service.ts CRUD, server actions, Zod schemas
  - phase: 04-recording-transcription
    provides: TranscriptionSegment model, transcription.service.ts, OpenAI SDK, lazy client pattern
provides:
  - classifyAndStoreEntries function for AI transcript classification
  - POST /api/admin/karute/[id]/classify endpoint
  - updateKaruteStatusAction and updateKaruteEntryTagsAction server actions
  - KaruteEntry tags (String[]) and segmentIndices (Int[]) fields
  - classifyKaruteSchema, updateKaruteStatusSchema, updateKaruteEntryTagsSchema validations
affects: [05-02, 05-03, karute-ui, karute-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "z.toJSONSchema() for Zod v4 structured outputs (not zodResponseFormat)"
    - "Lazy OpenAI client pattern reused from transcription.service.ts"
    - "Japanese system prompt for classification context"

key-files:
  created:
    - src/lib/services/classification.service.ts
    - app/api/admin/karute/[id]/classify/route.ts
    - src/lib/services/__tests__/classification.service.test.ts
  modified:
    - prisma/schema.prisma
    - src/lib/validations/karute.ts
    - app/actions/karute.ts

key-decisions:
  - "z.toJSONSchema() with target draft-7 for OpenAI structured outputs (Zod v4 incompatible with zodResponseFormat)"
  - "Collect segments from all recording sessions (flatMap) rather than single session"
  - "Added tags field to updateKaruteEntrySchema for full tag update flow through existing service layer"

patterns-established:
  - "AI classification via OpenAI structured outputs with manual JSON schema construction"
  - "Long-running AI operations use API routes (not server actions) for timeout tolerance"

# Metrics
duration: 7min
completed: 2026-03-07
---

# Phase 5 Plan 01: AI Classification Service Summary

**OpenAI gpt-4o classification service with structured outputs via z.toJSONSchema(), classify API route, status/tags server actions, and 6 unit tests**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-08T00:34:11Z
- **Completed:** 2026-03-08T00:41:33Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Classification service that takes transcription segments, sends to OpenAI gpt-4o, and stores structured karute entries with confidence scores and segment references
- KaruteEntry schema extended with tags (String[]), segmentIndices (Int[]), and displayOrder fields
- POST /api/admin/karute/[id]/classify API route with admin auth
- Server actions for status transitions and tag management
- 6 unit tests covering success, no-segments, empty-response, and error paths

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema extensions and classification service** - `5b71713` (feat)
2. **Task 2: Classification API route and status server action** - `c127f05` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added tags, segmentIndices, displayOrder to KaruteEntry
- `src/lib/services/classification.service.ts` - AI classification with OpenAI gpt-4o structured outputs
- `src/lib/validations/karute.ts` - Added classify, status update, and tags update schemas
- `src/lib/services/__tests__/classification.service.test.ts` - 6 unit tests for classification service
- `app/api/admin/karute/[id]/classify/route.ts` - POST endpoint for triggering classification
- `app/actions/karute.ts` - Added updateKaruteStatusAction and updateKaruteEntryTagsAction

## Decisions Made
- Used z.toJSONSchema() with target 'draft-7' instead of zodResponseFormat (Zod v4 compatibility)
- Collected segments from all recording sessions via flatMap (a karute record can have multiple sessions)
- Added tags to updateKaruteEntrySchema so existing updateKaruteEntry service handles tag updates without new service functions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added tags field to updateKaruteEntrySchema**
- **Found during:** Task 2 (updateKaruteEntryTagsAction implementation)
- **Issue:** The updateKaruteEntryTagsAction needs to pass tags through to updateKaruteEntry, but the existing updateKaruteEntrySchema did not include a tags field
- **Fix:** Added `tags: z.array(z.string()).optional()` to updateKaruteEntrySchema
- **Files modified:** src/lib/validations/karute.ts
- **Verification:** TypeScript compiles without errors
- **Committed in:** c127f05 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for tags to flow through existing service layer. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. OPENAI_API_KEY already configured from Phase 4.

## Next Phase Readiness
- Classification service ready for UI consumption (Plan 02: Karute Editor UI)
- API route ready for frontend to trigger classification
- Server actions ready for status workflow and tag management in editor

---
*Phase: 05-ai-classification-karute-ui*
*Completed: 2026-03-07*
