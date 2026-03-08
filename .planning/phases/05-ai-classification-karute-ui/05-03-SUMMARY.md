---
phase: 05-ai-classification-karute-ui
plan: 03
subsystem: ui
tags: [react, swr, react-pdf, next-intl, karute, admin, export, pdf]

# Dependency graph
requires:
  - phase: 03-karte-foundation
    provides: "Karute CRUD service, getKaruteRecordsByCustomer, Prisma schema"
  - phase: 05-ai-classification-karute-ui
    provides: "KaruteEditor UI, StatusBadge, EntryCard, barrel exports, karute editor page"
provides:
  - "KaruteHistory timeline component for per-customer karute history"
  - "KaruteHistoryItem with date, practitioner, status badge, entry count"
  - "Customer detail page tab navigation (Details / Karute)"
  - "GET /api/admin/customers/[id]/karute endpoint"
  - "KaruteDocument PDF component with Noto Sans JP for Japanese text"
  - "karute-export.service.ts with generateKarutePDF and generateKaruteText"
  - "GET /api/admin/karute/[id]/export endpoint (PDF and text formats)"
  - "Export buttons in KaruteEditor header"
affects: [karute-workflow, customer-detail]

# Tech tracking
tech-stack:
  added: ["@react-pdf/renderer"]
  patterns:
    - "Tab navigation via local state on customer detail page"
    - "React PDF with CDN font registration for CJK (Noto Sans JP)"
    - "React.createElement workaround for @react-pdf/renderer React type mismatch"

key-files:
  created:
    - src/components/karute/KaruteHistory.tsx
    - src/components/karute/KaruteHistoryItem.tsx
    - src/components/karute/KaruteDocument.tsx
    - src/lib/services/karute-export.service.ts
    - app/api/admin/customers/[id]/karute/route.ts
    - app/api/admin/karute/[id]/export/route.ts
  modified:
    - src/components/karute/index.ts
    - src/components/karute/KaruteEditor.tsx
    - app/[locale]/(admin)/admin/customers/[id]/customer-detail.tsx
    - messages/ja.json
    - messages/en.json
    - package.json

key-decisions:
  - "Tab navigation with local state (not URL hash) for customer detail Details/Karute tabs"
  - "@react-pdf/renderer with CDN-hosted Noto Sans JP for Japanese PDF rendering"
  - "React.createElement cast to any for renderToBuffer due to React types mismatch"

patterns-established:
  - "Tab UI pattern: border-bottom active state with local state toggle"
  - "PDF export via @react-pdf/renderer with CDN font registration"

# Metrics
duration: 4min
completed: 2026-03-07
---

# Phase 05 Plan 03: Karute History & Export Summary

**Per-customer karute history timeline tab on customer detail page, plus PDF/text export with Japanese Noto Sans JP font via @react-pdf/renderer**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-08T00:59:44Z
- **Completed:** 2026-03-08T01:04:03Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Karute history tab on customer detail page with chronological timeline (most recent first)
- Each history item shows date, practitioner, status badge, and entry count with link to editor
- PDF export with Japanese text support via Noto Sans JP font
- Plain text export as alternative format
- Export buttons integrated into KaruteEditor header

## Task Commits

Each task was committed atomically:

1. **Task 1: Customer karute history components and API** - `bb41cd0` (feat)
2. **Task 2: PDF/text export service and API route** - `5238983` (feat)

## Files Created/Modified
- `app/api/admin/customers/[id]/karute/route.ts` - GET endpoint for customer karute history
- `src/components/karute/KaruteHistory.tsx` - Timeline list with SWR data fetching
- `src/components/karute/KaruteHistoryItem.tsx` - Timeline item with date, practitioner, status badge
- `src/components/karute/KaruteDocument.tsx` - React PDF document component with Noto Sans JP
- `src/lib/services/karute-export.service.ts` - PDF and text generation service
- `app/api/admin/karute/[id]/export/route.ts` - Export API (PDF and text formats)
- `src/components/karute/KaruteEditor.tsx` - Added export buttons (PDF/Text)
- `src/components/karute/index.ts` - Added KaruteHistory, KaruteHistoryItem exports
- `app/[locale]/(admin)/admin/customers/[id]/customer-detail.tsx` - Added tab navigation with Karute tab
- `messages/ja.json` - Added customerDetail tab keys and karuteEditor export keys
- `messages/en.json` - Added customerDetail tab keys and karuteEditor export keys
- `package.json` - Added @react-pdf/renderer dependency

## Decisions Made
- Tab navigation uses local component state rather than URL hash (simpler, no URL clutter)
- @react-pdf/renderer with CDN-hosted Noto Sans JP fonts for Japanese PDF rendering
- React.createElement cast to any for renderToBuffer due to React 19 / @react-pdf types mismatch
- Customer info section always visible above tabs (not inside a tab)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- React types mismatch between React 19 and @react-pdf/renderer caused TS error on renderToBuffer; resolved with `as any` cast on createElement result.
- Buffer type not assignable to Response body; resolved with `new Uint8Array()` wrapper.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 5 (AI Classification & Karute UI) is complete across all 3 plans
- All karute features operational: classification, editor, history, export
- Ready for Phase 6 (AI Chat) or Phase 7 (Appointment View)

---
*Phase: 05-ai-classification-karute-ui*
*Completed: 2026-03-07*
