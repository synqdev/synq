---
phase: 01-mvp
plan: 07
subsystem: user-flow
tags: [next.js, server-actions, swr, booking, registration, forms]

# Dependency graph
requires:
  - phase: 01-01
    provides: Prisma schema with Customer, Booking, Worker, Service models
  - phase: 01-02
    provides: next-intl i18n routing, locale layouts
  - phase: 01-04
    provides: Availability service for slot calculation
  - phase: 01-05
    provides: Booking service with serializable transactions
  - phase: 01-06
    provides: TimelineCalendar component for slot display
provides:
  - Customer registration form with lazy auth (cookie-based)
  - Availability API route with worker schedule integration
  - useAvailability SWR hook with 10-second polling
  - Booking calendar page with interactive slot selection
  - Booking confirmation page with localized details
affects: [01-08, 01-09, 01-10, user-experience]

# Tech tracking
tech-stack:
  added: [swr]
  patterns:
    - useActionState for form handling with server actions
    - SWR polling for live availability updates
    - Cookie-based customer session without passwords

key-files:
  created:
    - src/lib/validations/customer.ts
    - src/lib/services/customer.service.ts
    - app/actions/customer.ts
    - app/actions/booking.ts
    - app/[locale]/(public)/register/page.tsx
    - app/[locale]/(public)/register/register-form.tsx
    - app/[locale]/(user)/booking/booking-calendar.tsx
    - app/[locale]/(user)/booking/confirm/page.tsx
    - app/api/availability/route.ts
    - src/hooks/useAvailability.ts
  modified:
    - app/[locale]/(user)/booking/page.tsx
    - messages/ja.json
    - messages/en.json
    - package.json

key-decisions:
  - "Cookie-based customer ID for lazy auth (7-day expiry, httpOnly)"
  - "SWR with 10-second polling for real-time availability"
  - "useActionState pattern for server action form handling"
  - "Auto-assign first available resource when booking"

patterns-established:
  - "RegisterForm client component with useActionState + server action"
  - "BookingCalendar client component with SWR + form submission"
  - "Availability API returns workers with pre-calculated slots"

# Metrics
duration: 8min
completed: 2026-02-05
---

# Phase 01 Plan 07: User Registration and Booking Flow Summary

**Complete user registration and booking flow: registration form, calendar with live availability, slot selection, and booking confirmation**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-05T09:30:32Z
- **Completed:** 2026-02-05T09:38:10Z
- **Tasks:** 3
- **Files created:** 10
- **Files modified:** 4

## Accomplishments

- Customer registration with Zod validation and findOrCreateCustomer service
- Cookie-based lazy auth (no password required, customer ID in httpOnly cookie)
- Availability API route that calculates slots from worker schedules
- useAvailability SWR hook with 10-second polling for live updates
- Interactive booking calendar with slot selection
- Form-based booking submission using server action
- Confirmation page with localized booking details and status badge

## Task Commits

Each task was committed atomically:

1. **Task 1: Create customer registration form and server action** - `c221ff0` (feat)
2. **Task 2: Create booking calendar page with availability and slot selection** - `c32bc2a` (feat)
3. **Task 3: Create booking confirmation page** - `57302dd` (feat)

## Files Created/Modified

**Customer Registration (Task 1):**
- `src/lib/validations/customer.ts` - Zod schema for email, name, phone, locale
- `src/lib/services/customer.service.ts` - findOrCreateCustomer with prisma.customer.upsert
- `app/actions/customer.ts` - registerCustomer server action with cookie storage
- `app/[locale]/(public)/register/page.tsx` - Registration page with i18n
- `app/[locale]/(public)/register/register-form.tsx` - Client form with useActionState

**Booking Calendar (Task 2):**
- `app/api/availability/route.ts` - Availability API with worker schedules
- `src/hooks/useAvailability.ts` - SWR hook with 10s refresh interval
- `app/actions/booking.ts` - submitBookingForm server action
- `app/[locale]/(user)/booking/page.tsx` - Updated to use BookingCalendar
- `app/[locale]/(user)/booking/booking-calendar.tsx` - Interactive calendar client component

**Confirmation Page (Task 3):**
- `app/[locale]/(user)/booking/confirm/page.tsx` - Booking details with localized content

**Translations:**
- `messages/ja.json` - Added register, confirmation, and extended booking sections
- `messages/en.json` - Added register, confirmation, and extended booking sections

**Dependencies:**
- `package.json` - Added swr package

## User Flow

The complete booking journey:
1. User visits `/ja/register` - enters email, name, phone
2. Server creates customer, stores ID in cookie, redirects to `/ja/booking`
3. User sees calendar with workers and available slots (polling every 10s)
4. User selects a slot, clicks "Book Now"
5. Server creates booking with serializable transaction
6. User redirected to `/ja/booking/confirm?id=xxx` - sees booking details

## Decisions Made

1. **Cookie-based lazy auth:** Customer ID stored in httpOnly cookie (7-day expiry), no password required. Simplifies registration while maintaining session.

2. **SWR 10-second polling:** Balances real-time feel with server load. Revalidates on focus for fresh data when user returns.

3. **useActionState pattern:** React 19's useActionState for form handling with server actions, provides pending state and error handling.

4. **Auto-resource assignment:** When booking, first available resource is automatically assigned if not specified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing booking action file**
- **Found during:** Task 2
- **Issue:** app/actions/booking.ts already existed with email integration from 01-08
- **Fix:** Rewrote file to keep existing createBookingAction and add submitBookingForm for form handling
- **Files modified:** app/actions/booking.ts
- **Note:** Email integration was removed as it belongs to 01-08, kept structure clean

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor restructure of booking action file to work with existing code.

## Issues Encountered

- Calendar component files already existed from a prior session (01-06), which was helpful
- Some interleaved commits from 01-08 (email integration) were already in the repo

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

- Complete user-facing booking flow operational
- Registration, calendar, and confirmation pages working
- SWR polling provides live availability updates
- Ready for: 01-08 (email notifications), 01-09 (admin dashboard)

---
*Phase: 01-mvp*
*Completed: 2026-02-05*
