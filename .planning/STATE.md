# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-04)

**Core value:** A slot is only bookable when BOTH the worker is free AND a physical resource (bed) is available.
**Current focus:** Phase 1: MVP

## Current Position

Phase: 1 of 3 (MVP)
Plan: 14 of 14 (complete)
Status: Phase complete
Last activity: 2026-02-06 - Completed 01-14-PLAN.md (Frontend refactor with EmployeeTimeline)

Progress: [████████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 14
- Average duration: 6 min
- Total execution time: 1.4 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-mvp | 14 | 82 min | 6 min |

**Recent Trend:**
- Last 5 plans: 4m, 4m, 1m, 4m, 9m
- Trend: stable (Phase 1 MVP complete with frontend refactor)

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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-06T00:11:25Z
Stopped at: Completed 01-14-PLAN.md (Frontend refactor with EmployeeTimeline) - Phase 1 MVP complete
Resume file: None (Phase 1 complete - ready for Phase 2 planning)
