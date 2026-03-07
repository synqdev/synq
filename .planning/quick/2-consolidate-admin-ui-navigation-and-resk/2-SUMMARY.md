# Quick Task 2: Consolidate Admin UI Navigation

## Changes

### Files Modified
- `app/[locale]/(admin)/layout.tsx` — Stripped SYNQ header and AdminNav; minimal wrapper only
- `src/components/calendar/prototype-calendar-view.tsx` — Made `sideActions` optional; SettingsRail only renders when provided
- `app/[locale]/(admin)/admin/dashboard/prototype-client.tsx` — Added Customers and Reports as embedded tab panels; removed side action rail; updated container to full viewport height
- `app/[locale]/(admin)/admin/dashboard/page.tsx` — Pass `initialCustomerWorkers` prop

### What Changed
1. Removed the layout-level SYNQ header and AdminNav tab bar
2. Dashboard timetable top tabs are now the ONLY navigation (8 tabs: Dashboard, Calendar, Customers, Workers, Services, Resources, Reports, Logout)
3. Customers and Reports render as embedded panels inside the timetable container, matching the existing Workers/Services/Resources pattern
4. Side action rail removed (no longer rendered)
5. Full viewport height utilized since header is gone

### Commit
4f3da62
