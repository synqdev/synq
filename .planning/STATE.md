# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-04)

**Core value:** A slot is only bookable when BOTH the worker is free AND a physical resource (bed) is available.
**Current focus:** Phase 2: Parity
**Phase 2 status:** In progress (started before finishing Phase 01.1 by explicit priority change)

## Current Position

Phase: 2 of 4 (Parity)
Plan: 7 of 8 (next: 02-08)
Status: Active execution
Last activity: 2026-02-19 - Completed 02-05 (reporting dashboard), 02-06 (worker rankings, repeat rate), 02-07 (CSV export)

Progress: [#####---] 50%

### Open PRs (targeting phase2)

| # | Branch | Feature | Tests |
|---|--------|---------|-------|
| 26 | codex/phase2-02-03-customer-detail | Customer detail page | - |
| 27 | test/customer-service-unit | Customer service unit tests | 28 |
| 28 | test/customer-api-route | Customer API route tests | 4 |
| 29 | codex/phase2-02-04-intake-upload | Intake form upload | 19 |
| 32 | codex/phase2-02-07-csv-export | CSV export (customers, bookings, revenue) | 24 |

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
- EmployeeTimeline name retained; TimelineCalendar reverted (2026-02-06)
- Admin cancel confirmation handled in popover (no browser confirm/alert) (2026-02-06)
- Admin timeline includes base available slot for day background (2026-02-06)
- Jest unit runs ignore mobile and e2e tests (2026-02-06)
- Zod validation allows non-UUID IDs for worker/booking tests (2026-02-06)
- auth.signOut uses i18n messages (2026-02-06)
- Booking calendar uses serviceDuration from API (no hardcoded 60) (2026-02-06)
- Admin CRM list uses shared Storybook DataTable component for sortable table UI (2026-02-17)

### Roadmap Evolution

- Phase 1.1 inserted after Phase 1: Post-MVP UI enhancements — prototype calendar, data table, updated types and exports (URGENT)
- Created executable plan `.planning/phases/01.1-post-mvp-ui-enhancements-prototype-calendar-data-table-updated-types-and-exports/01.1-01-PLAN.md`
- Priority updated on 2026-02-17: Start Phase 2 before completing Phase 01.1
- Delivery workflow updated on 2026-02-17: one task per branch + one PR per task for automated review

### Pending Todos

- Warning: empty package-lock.json causes `Unexpected end of JSON input` during installs.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-19
Stopped at: Phase 2 plans 02-05, 02-06, 02-07 completed (PRs #26-29, #32 open)
Resume file: `.planning/phases/02-parity/02-08-PLAN.md`
