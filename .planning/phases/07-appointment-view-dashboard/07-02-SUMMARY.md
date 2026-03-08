---
phase: 07-appointment-view-dashboard
plan: 02
subsystem: appointment-ui
tags: [appointment, sidebar, tabs, workstation]
key-files:
  created:
    - app/[locale]/appointment/[id]/layout.tsx
    - app/[locale]/appointment/[id]/page.tsx
    - app/[locale]/appointment/[id]/appointment-workstation.tsx
    - src/components/appointment/AppointmentSidebar.tsx
    - src/components/appointment/AppointmentSummaryBar.tsx
    - src/components/appointment/CustomerInfoPanel.tsx
  modified:
    - middleware.ts
decisions:
  - "Sidebar uses inline SVG icons (no icon library) consistent with codebase pattern"
  - "Settings tab shows summary via SWR fetch and links to full settings page"
  - "Karute tab shows empty state with icon when no karute record exists"
metrics:
  completed: 2026-03-08
  duration: 235s
  tasks: 2/2
---

# Phase 7 Plan 02: Appointment Workstation Page Summary

Complete appointment workstation at `/{locale}/appointment/{id}` with dark navy sidebar navigation, four tabs (Recording, Karute, Customer, Settings), summary bar, and auth protection via middleware + server component.

## Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Appointment page layout, server component, and middleware update | 0b215ce | layout.tsx, page.tsx, middleware.ts |
| 2 | Appointment workstation, sidebar, summary bar, and customer info panel | 7d60dbe | appointment-workstation.tsx, AppointmentSidebar.tsx, AppointmentSummaryBar.tsx, CustomerInfoPanel.tsx |

## What Was Built

### Appointment Layout (`layout.tsx`)
Server component layout wrapping children in ChatWrapper for AI chat context. Uses `h-screen bg-gray-50` flex container.

### Appointment Page (`page.tsx`)
Server component with full auth check via `getAdminSession()`. Loads booking with all relations (customer, worker, service, karuteRecords, recordingSessions). Fetches today's booking IDs for prev/next navigation. Serializes all dates to ISO strings for the client component. Redirects unauthenticated users to admin login.

### Middleware Update
Updated admin route regex from `/^\/[a-z]{2}\/admin\/(?!login)/` to `/^\/[a-z]{2}\/(admin\/(?!login)|appointment\/)/` to protect appointment routes with cookie presence check.

### Appointment Workstation (`appointment-workstation.tsx`)
Client component with tab switching between four tabs:
- **Recording**: Renders `RecordingPanel` with booking context (customerId, workerId, bookingId, karuteRecordId)
- **Karute**: Renders `KaruteEditor` if karute record exists, or empty state message when none
- **Customer**: Renders `CustomerInfoPanel` with read-only customer data
- **Settings**: Fetches settings via SWR from `/api/admin/settings`, shows summary with link to full settings page

### Appointment Sidebar (`AppointmentSidebar.tsx`)
Dark navy sidebar (`bg-[#1a2332]`) with responsive width (icon-only on mobile `w-16`, expanded on tablet+ `md:w-56`). Contains:
- Back to dashboard link
- Four tab shortcut buttons with inline SVG icons (mic, clipboard, user, gear)
- Active tab highlighting with `bg-white/10 text-white`
- AI Chat trigger button using `useChatContext()` to open chat with customer context
- Prev/Next appointment navigation links based on today's booking IDs

### Appointment Summary Bar (`AppointmentSummaryBar.tsx`)
Horizontal bar showing customer name, service, worker, time range (HH:MM - HH:MM), and status badge with color coding (green=CONFIRMED, yellow=PENDING, red=CANCELLED, gray=NOSHOW).

### Customer Info Panel (`CustomerInfoPanel.tsx`)
Lightweight read-only customer display showing name, email, phone, locale, visit count, last visit date, and notes. Includes link to full customer detail page.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npm run build` passed with zero TypeScript errors
- All new routes visible in build output (`/[locale]/appointment/[id]`)
- Middleware regex updated and verified in build
- All i18n keys from 07-01 used correctly (`admin.appointment`, `admin.sidebar`, `admin.settingsPage`)

## Self-Check: PASSED
