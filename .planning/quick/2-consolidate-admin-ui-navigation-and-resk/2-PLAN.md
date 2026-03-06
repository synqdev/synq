---
phase: 2-consolidate-admin-ui-navigation-and-resk
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/[locale]/(admin)/layout.tsx
  - app/[locale]/(admin)/admin/dashboard/prototype-client.tsx
  - src/components/calendar/prototype-calendar-view.tsx
  - app/[locale]/(admin)/admin/dashboard/page.tsx
autonomous: true
must_haves:
  truths:
    - "Admin layout has no SYNQ header and no AdminNav tabs"
    - "Dashboard timetable top tabs are the ONLY navigation between admin sections"
    - "Customers tab shows the customer list panel inside the timetable container"
    - "Reports tab shows the revenue dashboard panel inside the timetable container"
    - "Side action rail is not visible"
    - "Workers, Services, Resources tabs continue to work as embedded panels"
    - "Logout tab still works"
  artifacts:
    - path: "app/[locale]/(admin)/layout.tsx"
      provides: "Minimal admin layout wrapper without header or AdminNav"
    - path: "app/[locale]/(admin)/admin/dashboard/prototype-client.tsx"
      provides: "Central admin hub with all section tabs including customers and reports"
    - path: "src/components/calendar/prototype-calendar-view.tsx"
      provides: "TimetableWithTabs with optional side rail (hidden when not provided)"
  key_links:
    - from: "prototype-client.tsx"
      to: "CustomerList component"
      via: "import and render as panelContent when customers tab active"
    - from: "prototype-client.tsx"
      to: "RevenueDashboard component"
      via: "import and render as panelContent when reports tab active"
---

<objective>
Consolidate admin UI into a single-page hub where the dashboard timetable top tabs are the ONLY navigation. Remove the layout-level SYNQ header and AdminNav, hide the side action rail, and embed Customers and Reports as panels inside the timetable (matching how Workers/Services/Resources already work).

Purpose: Eliminate 3 redundant navigation layers, create a unified admin experience where everything lives inside the timetable chrome.
Output: Single-hub admin dashboard with all sections as embedded tab panels.
</objective>

<execution_context>
@/Users/anthonylee/.claude/get-shit-done/workflows/execute-plan.md
@/Users/anthonylee/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/[locale]/(admin)/layout.tsx
@app/[locale]/(admin)/admin-nav.tsx
@app/[locale]/(admin)/admin/dashboard/prototype-client.tsx
@app/[locale]/(admin)/admin/dashboard/page.tsx
@src/components/calendar/prototype-calendar-view.tsx
@app/[locale]/(admin)/admin/customers/customer-list.tsx
@app/[locale]/(admin)/admin/reports/revenue-dashboard.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Strip admin layout and make side rail optional in TimetableWithTabs</name>
  <files>
    app/[locale]/(admin)/layout.tsx
    src/components/calendar/prototype-calendar-view.tsx
  </files>
  <action>
    1. **layout.tsx** - Remove the SYNQ header and AdminNav entirely. Keep the auth check (`getAdminSession`). The layout should be a minimal full-height wrapper:
       - Remove the `import { AdminNav }` line
       - Remove the entire `<header>` block (the SYNQ h1 and AdminNav)
       - Remove the `max-w-[1600px]` constraint and padding from `<main>` since the dashboard needs full width
       - Keep `<div className="min-h-screen bg-gray-50">` as outer wrapper
       - The `<main>` should just be `<main>{children}</main>` with minimal/no padding (the timetable handles its own padding via `px-3 sm:px-4`)

    2. **prototype-calendar-view.tsx** - Make the `SettingsRail` (side action rail) conditional:
       - In `TimetableWithTabsProps`, make `sideActions` optional: `sideActions?: SideActionItem[]`
       - In the `TimetableWithTabs` component body, only render the `<SettingsRail>` if `sideActions` is provided and has items: `{sideActions && sideActions.length > 0 && (<SettingsRail ... />)}`
       - When side rail is hidden, the `<Timetable>` should take full width (it already has `flex-1` so this should work naturally)
  </action>
  <verify>
    Run `npx tsc --noEmit` to confirm no type errors from making sideActions optional.
  </verify>
  <done>
    Admin layout renders without header or AdminNav. TimetableWithTabs renders without side rail when sideActions is omitted or empty.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add Customers and Reports as embedded tab panels, remove side rail usage</name>
  <files>
    app/[locale]/(admin)/admin/dashboard/prototype-client.tsx
    app/[locale]/(admin)/admin/dashboard/page.tsx
  </files>
  <action>
    1. **prototype-client.tsx** - Add Customers and Reports tabs and embed their content:

       a. Update the `tabs` array to include customers and reports. Reorder to: Dashboard, Calendar, Customers, Workers, Services, Resources, Reports, Logout. Use appropriate icons:
          - `{ id: 'customers', label: 'Customers', icon: 'client' }`
          - `{ id: 'reports', label: 'Reports', icon: 'analytics' }`

       b. Update `embeddedPanelTabs` Set to include 'customers' and 'reports':
          `new Set(['calendar', 'workers', 'services', 'resources', 'customers', 'reports'])`

       c. Import `CustomerList` from `'../customers/customer-list'` and `RevenueDashboard` from `'../reports/revenue-dashboard'`.

       d. Add new props to `AdminDashboardPrototypeClientProps`:
          - `initialCustomerWorkers: Array<{ id: string; name: string }>` (workers for the customer list filter dropdown - these are already fetched as `workers` in page.tsx)

       e. Extend the `panelContent` conditional chain to handle the new tabs:
          - For `customers`: render `<CrudPanelSection title="Customers"><CustomerList locale={locale} workers={initialCustomerWorkers} /></CrudPanelSection>`
          - For `reports`: render `<CrudPanelSection title="Reports"><RevenueDashboard locale={locale} /></CrudPanelSection>`

       f. Remove the `sideActions` array constant entirely (lines 100-109).
       g. Remove `activeSideActionId` state and `setActiveSideActionId`.
       h. Remove the `sideActions`, `activeSideActionId`, and `onSideActionChange` props from the `<TimetableWithTabs>` call.

       i. Fix the container height. Currently it is `h-[calc(100dvh-140px)]` which accounted for the header. Since the header is removed, change to `h-[calc(100dvh-32px)]` (just a small margin) or `h-dvh` for full viewport height. Use `h-[calc(100dvh-16px)]` to leave minimal breathing room.

    2. **page.tsx** - Pass the new prop:
       - Add `initialCustomerWorkers={workers.map(w => ({ id: w.id, name: w.name }))}` to the `<AdminDashboardPrototypeClient>` call. The workers data is already fetched.
  </action>
  <verify>
    Run `npx tsc --noEmit` to confirm no type errors. Then run `npm run build` (or `npx next build`) to verify the build succeeds. Manually verify by running the dev server and navigating to `/admin/dashboard` - all tabs should appear and switching to Customers/Reports should show embedded content.
  </verify>
  <done>
    - Customers and Reports render as embedded panels inside the timetable when their tabs are selected
    - Side action rail is gone
    - All 8 tabs visible: Dashboard, Calendar, Customers, Workers, Services, Resources, Reports, Logout
    - Full viewport height utilized since header is removed
    - Existing Workers/Services/Resources panels still work
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Consolidated admin UI: removed SYNQ header and AdminNav, made dashboard timetable tabs the only navigation, embedded Customers and Reports as tab panels, removed side action rail. The admin is now a single-page hub.
  </what-built>
  <how-to-verify>
    1. Run `npm run dev` and navigate to `http://localhost:3000/en/admin/dashboard`
    2. Verify NO SYNQ header appears at the top
    3. Verify NO secondary tab navigation (AdminNav) appears
    4. Verify NO side action rail appears on the left
    5. Verify top tabs show: Dashboard, Calendar, Customers, Workers, Services, Resources, Reports, Logout
    6. Click "Customers" tab - should show customer list with search, filters, and data table inside the timetable chrome
    7. Click "Reports" tab - should show revenue dashboard with date controls and summary cards inside the timetable chrome
    8. Click "Workers" tab - should still show worker CRUD (existing functionality preserved)
    9. Click "Calendar" tab - should show the timeline calendar view
    10. Click "Logout" - should log out
    11. Verify the dashboard uses full viewport height (no wasted space from removed header)
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues to fix</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- `npx next build` succeeds
- No references to AdminNav remain in layout.tsx
- Side rail does not render when sideActions prop is omitted
- All admin sections accessible via timetable top tabs
</verification>

<success_criteria>
- Admin layout is a minimal wrapper (no header, no AdminNav)
- TimetableWithTabs top tabs are the SOLE navigation mechanism
- Customers and Reports are embedded panels (not separate route navigations)
- Side action rail is not visible
- All existing functionality (Workers, Services, Resources, Calendar, Logout) preserved
- Full viewport height utilized
</success_criteria>

<output>
After completion, create `.planning/quick/2-consolidate-admin-ui-navigation-and-resk/2-01-SUMMARY.md`
</output>
