# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-07)

**Core value:** A slot is only bookable when BOTH the worker is free AND a physical resource (bed) is available.
**Current focus:** v2.0 SYNQ Karte — AI Electronic Medical Records
**v1.0 status:** Complete — booking MVP + staff availability shipped

## Current Position

Phase: 04-recording-transcription (Plan 1 of 3)
Plan: 04-01 complete
Status: In progress
Last activity: 2026-03-07 — Completed 04-01 (Audio Recorder Hook & MIME Utility)

Progress: [###-----] 33%

### Open PRs

None

## Performance Metrics

**Velocity:**
- Total plans completed: 18
- Average duration: 6 min
- Total execution time: 1.4 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-mvp | 14 | 82 min | 6 min |
| 02.1-staff-availability | 2 | 12 min | 6 min |
| 03-karte-foundation | 3 | 8 min | 2.7 min |
| 04-recording-transcription | 1 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 4m, 9m, 3m, 3m, 2m
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Serializable transactions for booking creation (prevents race conditions)
- RLS on all Supabase tables (security requirement)
- Custom UI components over Shadcn (leaner bundle, full control)
- Service layer separation (business logic testable independently)
- TypeScript strict mode (type safety for complex booking logic)
- Deterministic seed IDs for idempotent upsert operations (01-01)
- Prisma singleton via globalThis pattern (01-01)
- Japanese as primary name field, English as optional nameEn (01-01)
- Japanese (ja) as default locale (01-02)
- createNavigation pattern for typed navigation helpers (01-02)
- Tailwind CSS 4 with @tailwindcss/postcss plugin (01-02)
- React.forwardRef for all UI components (01-03)
- Compound pattern for Card component (01-03)
- Variant/size lookup objects for component styling (01-03)
- Adjacent time ranges not overlapping - allows back-to-back bookings (01-04)
- Pure functions separated from database layer for testability (01-04)
- Jest with next/jest for TypeScript + path alias support (01-04)
- Availability checks inline within transaction for atomicity (01-05)
- Result type pattern for booking operations (success/error discriminated union) (01-05)
- Integration tests excluded from default test run (require DATABASE_URL) (01-05)
- Omit 'slot' from HTML attributes to avoid conflict with CalendarSlot prop (01-06)
- Sticky worker names and header for calendar scroll persistence (01-06)
- Graceful email degradation: failures logged but don't block booking (01-08)
- @/emails/* path alias for email templates (01-08)
- Cookie-based customer ID for lazy auth, 7-day httpOnly (01-07)
- SWR with 10-second polling for real-time availability (01-07)
- useActionState pattern for server action form handling (01-07)
- JWT tokens via jose library for Edge-compatible admin auth (01-09)
- Middleware checks cookie presence only; full JWT verification in pages (01-09)
- Route group (admin) with nested admin/ folder for correct /admin/* URLs (01-09)
- Soft delete for all entities (isActive=false) to preserve booking history (01-10)
- Inline table editing replaces row with form rather than modal (01-10)
- Tab-style admin navigation in header under title (01-10)
- RLS policies use session variables (app.customer_id, app.role) for access control (01-11)
- Rate limiting via Upstash Redis with graceful fallback when not configured (01-11)
- Sentry disabled in development unless DSN explicitly set (01-11)
- Booking service errors tagged with service/operation for Sentry filtering (01-11)
- Admin has full database access via app.role='admin' session variable (01-11)
- Unified polling hook for both user and admin modes instead of separate hooks (01-12)
- 10-second polling with pause when tab hidden for efficiency (01-12)
- Activity-based adaptive polling via useAdaptivePolling hook (01-12)
- 100% coverage requirement only on critical business logic (01-12)
- v8 coverage provider for faster test execution (01-12)
- Service selection must precede availability checking (duration affects slots) (01-13)
- Admin time blocking uses bookings with system entities rather than schedule entries (01-13)
- Block service is inactive (isActive: false) to hide from public API (01-13)
- EmployeeTimeline signature matches API response (workers with nested slots) (01-14)
- Single component with mode prop for admin/user behavior variation (01-14)
- Multi-page booking flow with URL param state management (01-14)
- Mapper pattern for API-to-component data transformation (01-14)
- Green (#d1fae5) for available slots, gray (#e5e7eb) for booked (01-14)
- EmployeeTimeline name retained; TimelineCalendar reverted (2026-02-06)
- Admin cancel confirmation handled in popover (no browser confirm/alert) (2026-02-06)
- Admin timeline includes base available slot for day background (2026-02-06)
- Jest unit runs ignore mobile and e2e tests (2026-02-06)
- Zod validation allows non-UUID IDs for worker/booking tests (2026-02-06)
- auth.signOut uses i18n messages (2026-02-06)
- Booking calendar uses serviceDuration from API (no hardcoded 60) (2026-02-06)
- Admin CRM list uses shared Storybook DataTable component for sortable table UI (2026-02-17)
- findFirst+update/create upsert pattern for WorkerSchedule (no unique constraint on workerId+dayOfWeek) (02.1-01)
- ZodError returned as discriminated result type; other errors rethrown (02.1-01)
- isAvailable=false skips Zod time validation (unavailable days don't need valid times) (02.1-01)
- generateTimeSlots('06:00', '23:30', 30) for select dropdown time options (02.1-02)
- Hidden input for isAvailable toggle ensures value always submitted in FormData (02.1-02)
- schedule key added to admin.workersPage namespace to avoid multiple useTranslations calls (02.1-02)
- Flat storage path ({recordingId}.webm) for single-shop simplicity (03-01)
- Admin-only RLS on all karute tables, no customer self-service (03-01)
- Per-bucket storage modules with singleton Supabase client pattern (03-01)
- Generic 'data' property in KaruteResult<T> for multi-entity service (03-02)
- Best-effort audio cleanup on delete with warn logging, non-blocking (03-02)
- Separate lighter include type for list queries (omit recording sessions) (03-02)
- Server actions follow admin-booking.ts pattern exactly for consistency (03-03)
- jest.fn() delegation in mock factories to avoid hoisting issues with const (03-03)
- AnalyserNode connected to source only (not destination) to avoid audio feedback (04-01)
- setInterval with 1-second increment for timer (not timeDelta, per research anti-pattern) (04-01)
- Ref-based resource tracking for MediaRecorder, AudioContext, stream, chunks (04-01)

### Roadmap Evolution

- Phase 1.1 inserted after Phase 1: Post-MVP UI enhancements — prototype calendar, data table, updated types and exports (URGENT)
- Created executable plan `.planning/phases/01.1-post-mvp-ui-enhancements-prototype-calendar-data-table-updated-types-and-exports/01.1-01-PLAN.md`
- Priority updated on 2026-02-17: Start Phase 2 before completing Phase 01.1
- Delivery workflow updated on 2026-02-17: one task per branch + one PR per task for automated review
- Phase 3 added (former Phase 3 Differentiation pushed to Phase 4): Payments & Membership — Stripe/Apple Pay checkout, membership plans with QR codes, user & admin payment pages

### Pending Todos

- Warning: empty package-lock.json causes `Unexpected end of JSON input` during installs.

### Blockers/Concerns

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Merge PR #34 (phase2 → main) | 2026-02-25 | 7ae9792 | [1-merge-pr-34-phase2-main](./quick/1-merge-pr-34-phase2-main/) |
| 2 | Consolidate admin UI navigation and reskin pages | 2026-03-06 | 4f3da62 | [2-consolidate-admin-ui-navigation-and-resk](./quick/2-consolidate-admin-ui-navigation-and-resk/) |

## Session Continuity

Last session: 2026-03-07
Stopped at: Completed 04-01-PLAN.md (Audio Recorder Hook & MIME Utility)
Resume: Continue with 04-02-PLAN.md (Recording UI components)
