---
phase: 01-mvp
plan: 01
subsystem: database
tags: [prisma, postgresql, orm, schema, seed]

# Dependency graph
requires: []
provides:
  - Prisma schema with 6 core models (Worker, Service, Resource, Customer, Booking, WorkerSchedule)
  - Singleton Prisma client for connection pooling
  - Idempotent seed script with test data
  - Database indexes for availability queries
affects: [01-02, 01-04, 01-05, 01-06, 01-09, 01-10]

# Tech tracking
tech-stack:
  added: [prisma, tsx]
  patterns: [singleton-client, upsert-seeding, composite-indexes]

key-files:
  created:
    - prisma/schema.prisma
    - prisma/seed.ts
    - src/lib/db/client.ts
    - .env.example
    - .gitignore
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Use deterministic IDs for seed data (enables idempotent upsert operations)"
  - "Prisma singleton via globalThis pattern (prevents connection pool exhaustion in dev)"
  - "Japanese as primary name field, English as optional nameEn (locale-first design)"

patterns-established:
  - "Prisma singleton: src/lib/db/client.ts exports named 'prisma' instance"
  - "Seed idempotency: Use upsert with deterministic IDs for re-runnable seeds"
  - "Index strategy: Composite indexes on time-range queries for Booking table"

# Metrics
duration: 4min
completed: 2026-02-05
---

# Phase 01 Plan 01: Database Schema Summary

**Prisma schema with 6 models, composite indexes for availability queries, singleton client, and idempotent seed script**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-05T04:24:17Z
- **Completed:** 2026-02-05T04:29:03Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Created complete Prisma schema with all 6 core models for booking system
- Configured composite indexes on Booking table for efficient time-range queries
- Built singleton Prisma client that prevents connection pool exhaustion
- Created idempotent seed script with 3 workers, 1 service, 3 beds, and default schedules

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure Prisma and create database schema** - `dd66049` (feat)
2. **Task 2: Create Prisma client singleton and seed script** - `1ed8676` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - Complete database schema with 6 models, relations, and indexes
- `prisma/seed.ts` - Idempotent seed script creating workers, service, resources, schedules
- `src/lib/db/client.ts` - Singleton Prisma client with dev logging
- `.env.example` - Environment variable template for Supabase connection
- `package.json` - Added db scripts (generate, push, seed, reset) and tsx dependency
- `.gitignore` - Excludes .env and generated Prisma files

## Decisions Made

1. **Deterministic seed IDs** - Using predictable IDs like `worker-tanaka` enables idempotent upsert operations, making the seed script safe to run multiple times without duplicating data.

2. **Singleton via globalThis** - The Prisma client singleton pattern uses `globalThis` to survive Next.js hot module reloading in development, preventing connection pool exhaustion.

3. **Japanese-first naming** - The `name` field is primary (Japanese), with optional `nameEn` for English fallback. This aligns with the Japanese-first locale strategy.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added DIRECT_URL to .env for validation**
- **Found during:** Task 1 (Prisma validate)
- **Issue:** `prisma validate` failed because DIRECT_URL env var was required but not set in .env
- **Fix:** Decoded the local Prisma Postgres API key to extract the direct database URL and added it to .env
- **Files modified:** .env (not committed, gitignored)
- **Verification:** `prisma validate` passes
- **Committed in:** N/A (env file not tracked)

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** Minor env configuration fix for local development. No scope creep.

## Issues Encountered

None - schema and seed scripts were created as specified.

## User Setup Required

None - no external service configuration required. The local Prisma Postgres dev server is pre-configured.

**Note:** For production deployment, users must:
1. Create a Supabase project
2. Copy `.env.example` to `.env`
3. Fill in `DATABASE_URL` and `DIRECT_URL` from Supabase dashboard
4. Run `npx prisma db push` to apply schema
5. Run `npm run db:seed` to populate initial data

## Next Phase Readiness

- Schema is ready for database push when env vars are configured
- Prisma client types are generated and available for import
- Seed script is ready to populate development data
- All indexes defined for efficient availability queries

**Ready for:**
- Plan 01-02 (i18n Setup) - no database dependency
- Plan 01-04 (Availability Service TDD) - needs database tables
- Plan 01-05 (Booking Service TDD) - needs database tables

---
*Phase: 01-mvp*
*Completed: 2026-02-05*
