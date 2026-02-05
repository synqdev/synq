---
phase: 01-mvp
plan: 04
subsystem: services
tags: [availability, time-utils, tdd, pure-functions, double-bottleneck]

# Dependency graph
requires:
  - phase: 01-01
    provides: Project foundation with TypeScript and Prisma
provides:
  - Pure functions for time overlap detection
  - Availability calculation with double-bottleneck constraint
  - Comprehensive test suite for booking logic
affects: [01-05, 01-06, 01-07, booking-service, api-routes]

# Tech tracking
tech-stack:
  added: [jest, ts-jest, @testing-library/jest-dom, @testing-library/react]
  patterns: [TDD, pure-functions, separation-of-concerns]

key-files:
  created:
    - src/lib/utils/time.ts
    - src/lib/services/availability.service.ts
    - __tests__/unit/time.test.ts
    - __tests__/unit/availability.test.ts
    - jest.config.ts
    - jest.setup.ts
  modified:
    - package.json

key-decisions:
  - "Adjacent time ranges (end equals start) are NOT overlapping - allows back-to-back bookings"
  - "Pure functions separated from database layer for testability"
  - "Jest with next/jest for TypeScript + path alias support"

patterns-established:
  - "TDD for business logic: RED-GREEN-REFACTOR cycle with atomic commits"
  - "Time utilities use HH:MM string format for simplicity"
  - "Availability functions return available resource IDs per slot"

# Metrics
duration: 18min
completed: 2026-02-05
---

# Phase 01-04: Availability Logic (TDD) Summary

**Pure time utilities and double-bottleneck availability functions with 100% test coverage using TDD cycle**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-05T05:37:08Z
- **Completed:** 2026-02-05T05:55:36Z
- **Tasks:** 2 (TDD cycle: RED + GREEN)
- **Files modified:** 8

## Accomplishments

- Time overlap detection handling all edge cases (partial overlap, containment, adjacent)
- Slot generation based on worker schedule and service duration
- Double-bottleneck availability: slot only available when worker AND at least one resource free
- 48 tests with 100% code coverage

## Task Commits

Each TDD phase was committed atomically:

1. **Task 1: RED - Failing tests** - `4000a0c` (test)
   - Jest configuration with next/jest
   - 27 tests for time utilities (isOverlapping, generateTimeSlots, parseTime, formatTime)
   - 21 tests for availability service (checkWorkerAvailability, checkResourceAvailability, getAvailableSlots)

2. **Task 2: GREEN - Implementation** - `f2bb70c` (feat)
   - Time utilities in src/lib/utils/time.ts
   - Availability service in src/lib/services/availability.service.ts
   - All 48 tests pass with 100% coverage

## Files Created/Modified

- `src/lib/utils/time.ts` - Time parsing, formatting, overlap detection, slot generation
- `src/lib/services/availability.service.ts` - Worker/resource availability checks, slot calculation
- `__tests__/unit/time.test.ts` - Time utility tests (27 tests)
- `__tests__/unit/availability.test.ts` - Availability service tests (21 tests)
- `jest.config.ts` - Jest configuration with next/jest, path aliases, coverage thresholds
- `jest.setup.ts` - Test setup with @testing-library/jest-dom
- `package.json` - Added test scripts and Jest dependencies

## Decisions Made

1. **Adjacent ranges not overlapping:** `isOverlapping('09:00', '10:00', '10:00', '11:00') = false`
   - Rationale: Allows back-to-back bookings without gaps
   - Uses `<` comparison instead of `<=` in overlap logic

2. **Pure functions isolated from database:**
   - Functions take booking arrays as parameters, don't query database directly
   - Enables unit testing without mocking database
   - Booking service will pass in relevant bookings

3. **Slot returns available resource IDs:**
   - Each slot includes `availableResourceIds` array
   - Booking service can then select which resource to book
   - Supports future features like resource preferences

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

1. **ts-node required for Jest TypeScript config:**
   - Jest requires ts-node to parse jest.config.ts
   - Solution: Added ts-node as dev dependency

## Next Phase Readiness

- Time utilities ready for use by booking service
- Availability functions ready to be integrated with database queries
- Test infrastructure established for future TDD work
- Coverage thresholds configured (80% minimum)

---
*Phase: 01-mvp*
*Completed: 2026-02-05*
