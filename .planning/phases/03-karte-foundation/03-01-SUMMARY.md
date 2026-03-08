---
phase: 03-karte-foundation
plan: 01
subsystem: database
tags: [prisma, supabase-storage, rls, postgres, schema]

# Dependency graph
requires:
  - phase: 01-mvp
    provides: "Customer, Worker, Booking models and Prisma schema conventions"
provides:
  - "KaruteRecord, KaruteEntry, RecordingSession, TranscriptionSegment Prisma models"
  - "KaruteStatus, RecordingStatus, KaruteEntryCategory enums"
  - "RLS policies for all four karute tables (admin-only)"
  - "Storage policies for recordings bucket (insert/select/delete)"
  - "recording-storage.ts module (upload, signed URL, delete)"
affects: [03-02, 03-03, karute-service, karute-api, karute-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Karute models follow existing Prisma conventions with domain-scoped enums"
    - "Recording storage mirrors supabase-storage.ts singleton pattern"

key-files:
  created:
    - "prisma/migrations/20260307_karute_rls_policies/migration.sql"
    - "prisma/migrations/20260307_recordings_storage_policies/migration.sql"
    - "src/lib/storage/recording-storage.ts"
  modified:
    - "prisma/schema.prisma"

key-decisions:
  - "Flat storage path ({recordingId}.webm) for single-shop simplicity"
  - "Admin-only RLS on all karute tables (no customer self-service)"
  - "Idempotent DO $$ blocks for storage policies matching intake-forms pattern"

patterns-established:
  - "Domain-scoped Prisma enums (KaruteStatus, RecordingStatus, KaruteEntryCategory)"
  - "Per-bucket storage modules with singleton Supabase client"

# Metrics
duration: 2min
completed: 2026-03-07
---

# Phase 03 Plan 01: Schema & Storage Foundation Summary

**Four karute Prisma models with RLS policies, recordings storage bucket policies, and recording-storage.ts upload/URL/delete module**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-07T20:18:45Z
- **Completed:** 2026-03-07T20:20:28Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Added KaruteRecord, KaruteEntry, RecordingSession, TranscriptionSegment models with proper indexes and relations
- Created RLS migration enabling row-level security on all four karute tables with admin-only policies
- Created idempotent storage policy migration for recordings bucket (insert/select/delete)
- Built recording-storage.ts module with uploadRecording, getRecordingSignedUrl, deleteRecording functions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add karute models and enums to Prisma schema** - `845302e` (feat)
2. **Task 2: Create RLS and storage policy migration SQL files** - `823bb40` (feat)
3. **Task 3: Create recording storage module** - `8292f1f` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added 3 enums, 4 models, relation fields on Customer/Worker/Booking
- `prisma/migrations/20260307_karute_rls_policies/migration.sql` - RLS on 4 karute tables
- `prisma/migrations/20260307_recordings_storage_policies/migration.sql` - Storage policies for recordings bucket
- `src/lib/storage/recording-storage.ts` - Upload, signed URL, delete for audio recordings

## Decisions Made
- Followed plan as specified -- no additional decisions needed beyond plan directives

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**External services require manual configuration:**
- Create private bucket named 'recordings' in Supabase Dashboard (Storage -> New bucket -> Name: recordings, Public: OFF, File size limit: 100MB, Allowed MIME types: audio/webm, audio/mp4, audio/wav, audio/ogg)
- Run `prisma db push` to sync schema to database
- Apply RLS migration: `psql < prisma/migrations/20260307_karute_rls_policies/migration.sql`
- Apply storage policies: `psql < prisma/migrations/20260307_recordings_storage_policies/migration.sql`

## Issues Encountered
None

## Next Phase Readiness
- Schema foundation complete for karute service layer (03-02)
- Recording storage module ready for API route integration (03-03)
- Pre-existing TS errors in calendar-mappers test (serviceId missing) are unrelated to this plan

---
*Phase: 03-karte-foundation*
*Completed: 2026-03-07*
