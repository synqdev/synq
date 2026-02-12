---
phase: 01-mvp
plan: 02
subsystem: infra
tags: [next-intl, i18n, next.js, tailwind, app-router]

# Dependency graph
requires:
  - phase: none
    provides: initial project setup
provides:
  - next-intl routing with ja/en locales
  - App Router locale structure with route groups
  - TypeScript path aliases (@/*)
  - Service layer directory structure
  - Tailwind CSS 4 configuration
affects: [01-03, 01-04, 01-05, 01-06, 01-07, 01-08, 01-09, 01-10, 01-11, 01-12]

# Tech tracking
tech-stack:
  added: [next-intl@4.8.2, tailwindcss@4.1.18, @tailwindcss/postcss]
  patterns: [async-params, route-groups, service-layer]

key-files:
  created:
    - src/i18n/routing.ts
    - src/i18n/request.ts
    - src/i18n/navigation.ts
    - middleware.ts
    - messages/ja.json
    - messages/en.json
    - app/[locale]/layout.tsx
    - app/[locale]/page.tsx
    - app/[locale]/(public)/layout.tsx
    - app/[locale]/(user)/layout.tsx
    - app/[locale]/(admin)/layout.tsx
    - next.config.ts
    - tsconfig.json
    - postcss.config.mjs
  modified:
    - package.json

key-decisions:
  - "Japanese (ja) as default locale"
  - "createNavigation pattern for typed navigation helpers"
  - "Tailwind CSS 4 with @tailwindcss/postcss plugin"

patterns-established:
  - "Next.js 15 async params pattern: const { locale } = await params"
  - "Route groups for (public), (user), (admin) organization"
  - "Service layer directories under src/lib/"

# Metrics
duration: 4min
completed: 2026-02-05
---

# Phase 1 Plan 02: Project Structure and i18n Summary

**Next.js 15 App Router with next-intl Japanese/English routing, route groups, and service layer directory structure**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-05T04:25:19Z
- **Completed:** 2026-02-05T04:29:38Z
- **Tasks:** 2
- **Files modified:** 27

## Accomplishments
- Configured next-intl with Japanese (default) and English locales
- Created App Router structure with locale-aware layouts
- Established (public), (user), (admin) route groups
- Set up Tailwind CSS 4 with @tailwindcss/postcss
- Created service layer directory structure for future plans
- Added TypeScript path aliases (@/*)

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure next-intl with Japanese and English locales** - `17531dc` (feat)
2. **Task 2: Create App Router directory structure with locale layouts** - `d9fded7` (feat)

## Files Created/Modified

**i18n Configuration:**
- `src/i18n/routing.ts` - Locale routing configuration (ja default, en)
- `src/i18n/request.ts` - Server-side locale resolution
- `src/i18n/navigation.ts` - Typed navigation helpers (Link, redirect, etc.)
- `middleware.ts` - Locale detection middleware
- `messages/ja.json` - Japanese translations (44 lines)
- `messages/en.json` - English translations (44 lines)

**App Router Structure:**
- `app/[locale]/layout.tsx` - Root locale layout with NextIntlClientProvider
- `app/[locale]/page.tsx` - Homepage with welcome translations
- `app/[locale]/globals.css` - Tailwind CSS with Japanese text optimizations
- `app/[locale]/(public)/layout.tsx` - Public routes layout
- `app/[locale]/(public)/page.tsx` - Public landing page
- `app/[locale]/(user)/layout.tsx` - User routes layout (auth placeholder)
- `app/[locale]/(user)/booking/page.tsx` - Booking page placeholder
- `app/[locale]/(admin)/layout.tsx` - Admin routes layout (auth placeholder)
- `app/[locale]/(admin)/dashboard/page.tsx` - Admin dashboard placeholder

**Configuration:**
- `next.config.ts` - Next.js config with next-intl plugin
- `tsconfig.json` - TypeScript strict mode with path aliases
- `postcss.config.mjs` - Tailwind CSS 4 PostCSS config
- `package.json` - Added dev/build/start scripts

**Service Layer Directories:**
- `src/lib/services/.gitkeep`
- `src/lib/validations/.gitkeep`
- `src/lib/utils/.gitkeep`
- `src/components/ui/.gitkeep`
- `src/components/calendar/.gitkeep`
- `src/types/.gitkeep`
- `src/hooks/.gitkeep`

## Decisions Made

1. **Japanese (ja) as default locale** - Target market is Japan, Japanese-first experience
2. **createNavigation pattern** - Used next-intl v4 createNavigation for typed Link, redirect, etc.
3. **Tailwind CSS 4 with @tailwindcss/postcss** - Required separate plugin for Next.js integration
4. **CSS custom properties for theming** - Added in globals.css for runtime theme customization

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] PostCSS configuration conflict**
- **Found during:** Task 1 (build verification)
- **Issue:** Tailwind CSS 4 requires @tailwindcss/postcss plugin, not direct tailwindcss plugin
- **Fix:** Installed @tailwindcss/postcss, created postcss.config.mjs with correct config
- **Files modified:** postcss.config.mjs (created), package.json (updated)
- **Verification:** npm run build succeeded
- **Committed in:** 17531dc (Task 1 commit)

**2. [Rule 1 - Bug] Link import from next-intl**
- **Found during:** Task 2 (build verification)
- **Issue:** next-intl v4 no longer exports Link directly, requires createNavigation
- **Fix:** Created src/i18n/navigation.ts with createNavigation pattern
- **Files modified:** src/i18n/navigation.ts (created), app/[locale]/page.tsx (updated import)
- **Verification:** npm run build succeeded
- **Committed in:** d9fded7 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correct Next.js 15 + next-intl v4 integration. No scope creep.

## Issues Encountered

- Port 3000 sometimes in use during testing (Next.js auto-switched to 3001)
- TypeScript direct compilation of source files shows node_modules errors (expected, Next.js build handles correctly)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- i18n foundation complete for all future plans
- Route groups ready for feature implementation
- Service layer directories ready for business logic (Plan 03+)
- TypeScript strict mode enforced for type safety
- Ready for: Plan 03 (Prisma schema), Plan 05 (UI components), Plan 07 (user auth)

---
*Phase: 01-mvp*
*Completed: 2026-02-05*
