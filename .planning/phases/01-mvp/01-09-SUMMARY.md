---
phase: 01-mvp
plan: 09
subsystem: auth
tags: [jwt, jose, admin, middleware, calendar, next-auth]

# Dependency graph
requires:
  - phase: 01-06
    provides: TimelineCalendar component for worker-based time slot display
  - phase: 01-07
    provides: Booking service and customer registration flow
provides:
  - Admin JWT authentication with 24h session expiry
  - Protected admin routes via middleware
  - Admin dashboard with interactive calendar view
  - Booking modal for viewing/editing booking details
affects: [admin-booking-management, admin-features, security]

# Tech tracking
tech-stack:
  added: [jose]
  patterns:
    - JWT session tokens for admin authentication
    - Middleware-based route protection with cookie check
    - Server-side session verification in protected pages

key-files:
  created:
    - src/lib/auth/admin.ts
    - app/actions/admin.ts
    - app/[locale]/(admin)/admin/login/page.tsx
    - app/[locale]/(admin)/admin/dashboard/page.tsx
    - app/[locale]/(admin)/admin/dashboard/admin-calendar.tsx
    - app/[locale]/(admin)/admin/dashboard/booking-modal.tsx
  modified:
    - middleware.ts
    - app/[locale]/(admin)/layout.tsx
    - .env.example

key-decisions:
  - "JWT tokens via jose library for Edge-compatible, lightweight auth"
  - "Middleware checks cookie presence only; full JWT verification in pages"
  - "Route group (admin) with nested admin/ folder for correct /admin/* URLs"

patterns-established:
  - "useActionState pattern for admin login form handling"
  - "Admin session cookie named 'admin_session' with 24h maxAge"
  - "router.refresh() after modal close to reload booking data"

# Metrics
duration: 10min
completed: 2026-02-05
---

# Phase 01 Plan 09: Admin Authentication and Dashboard Summary

**JWT admin auth with jose library, protected routes via middleware, and interactive calendar dashboard with booking management modal**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-05T18:30:06Z
- **Completed:** 2026-02-05T18:39:50Z
- **Tasks:** 2
- **Files modified:** 9 (6 created, 3 modified)

## Accomplishments

- Admin authentication with JWT sessions using jose library
- Admin login page with useActionState form handling
- Middleware-based route protection redirecting unauthenticated users to login
- Interactive admin dashboard with calendar view showing all bookings
- Booking modal for viewing, editing, and canceling bookings
- Date navigation (previous/next/today) and date picker in calendar

## Task Commits

1. **Task 1: Create admin authentication utilities and login page** - `a23d5ea` (feat)
2. **Task 2: Protect admin routes and create dashboard with calendar** - `325f798` (feat)

## Files Created/Modified

- `src/lib/auth/admin.ts` - JWT auth utilities (verify, create, get session)
- `app/actions/admin.ts` - Server actions for login/logout
- `app/[locale]/(admin)/admin/login/page.tsx` - Admin login form
- `app/[locale]/(admin)/admin/dashboard/page.tsx` - Dashboard page fetching bookings
- `app/[locale]/(admin)/admin/dashboard/admin-calendar.tsx` - Interactive calendar client component
- `app/[locale]/(admin)/admin/dashboard/booking-modal.tsx` - Booking details modal
- `middleware.ts` - Admin route protection
- `app/[locale]/(admin)/layout.tsx` - Admin layout with logout button
- `.env.example` - Admin credential placeholders

## Decisions Made

- **jose over jsonwebtoken:** Chose jose for Edge runtime compatibility and ESM-native support
- **Cookie presence in middleware, JWT verify in pages:** Middleware only checks if cookie exists for performance; full JWT verification happens in individual pages
- **Route structure (admin)/admin/:** Next.js route groups in parentheses don't affect URL, so needed nested `admin/` folder for `/admin/*` URL paths

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed route structure for admin URLs**
- **Found during:** Task 2 (testing admin routes)
- **Issue:** Admin routes returned 404 because `(admin)` route group doesn't add to URL path
- **Fix:** Restructured from `(admin)/login/` to `(admin)/admin/login/` to create proper `/admin/login` URL
- **Files modified:** Moved all admin pages under `(admin)/admin/` subdirectory
- **Verification:** Build shows correct routes, curl tests return expected status codes
- **Committed in:** 325f798 (Task 2 commit)

**2. [Rule 1 - Bug] Removed invalid Prisma select field**
- **Found during:** Task 2 (build verification)
- **Issue:** `durationMinutes` doesn't exist on Service select type
- **Fix:** Removed the field from the Prisma query
- **Verification:** Build compiles successfully
- **Committed in:** 325f798 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correct routing and compilation. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations.

## User Setup Required

**Environment variables to set:**
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=123
ADMIN_SESSION_SECRET=your-secret-key-here-change-in-production
```

These are already documented in `.env.example`.

## Next Phase Readiness

- Admin authentication complete and working
- Dashboard displays bookings with full details
- Booking modal supports view/edit/cancel operations
- Ready for Plan 10 (Admin CRUD operations) which will add create/update/delete functionality
- Server actions for booking management already created in `app/actions/admin-booking.ts`

---
*Phase: 01-mvp*
*Completed: 2026-02-05*
