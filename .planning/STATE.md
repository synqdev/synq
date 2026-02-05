# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-04)

**Core value:** A slot is only bookable when BOTH the worker is free AND a physical resource (bed) is available.
**Current focus:** Phase 1: MVP

## Current Position

Phase: 1 of 3 (MVP)
Plan: 8 of 12 (complete)
Status: In progress
Last activity: 2026-02-05 — Completed 01-07-PLAN.md (User Registration and Booking Flow)

Progress: [████████░░] 67%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 6 min
- Total execution time: 0.82 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-mvp | 8 | 50 min | 6 min |

**Recent Trend:**
- Last 5 plans: 18m, 4m, 2m, 4m, 8m
- Trend: stable (user registration flow complete)

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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-05T09:38:10Z
Stopped at: Completed 01-07-PLAN.md (User Registration and Booking Flow)
Resume file: .planning/phases/01-mvp/01-09-PLAN.md
