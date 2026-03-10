---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/admin/workers/[id]/route.ts
  - app/[locale]/(admin)/admin/workers/[id]/page.tsx
  - app/[locale]/(admin)/admin/workers/[id]/worker-detail.tsx
  - messages/en.json
  - messages/ja.json
autonomous: true
must_haves:
  truths:
    - "Admin can navigate to a worker detail page from the worker list"
    - "Worker detail page shows worker info, weekly schedule with edit capability, and performance stats"
    - "Schedule editing works inline on the detail page (reuses existing ScheduleEditor)"
    - "Performance stats show total revenue, booking count, and average per booking for the worker"
  artifacts:
    - path: "app/api/admin/workers/[id]/route.ts"
      provides: "GET endpoint returning worker detail with schedule and metrics"
    - path: "app/[locale]/(admin)/admin/workers/[id]/page.tsx"
      provides: "Server component with auth guard"
    - path: "app/[locale]/(admin)/admin/workers/[id]/worker-detail.tsx"
      provides: "Client component with tabs: info/schedule, performance stats"
  key_links:
    - from: "worker-detail.tsx"
      to: "/api/admin/workers/[id]"
      via: "SWR fetch"
    - from: "worker-detail.tsx"
      to: "schedule-editor.tsx"
      via: "ScheduleEditor component import from ../schedule"
    - from: "worker-table.tsx"
      to: "workers/[id]"
      via: "Link on worker name"
---

<objective>
Create a worker detail page following the customer detail page pattern. The page shows worker info at top, tabs for schedule editing (reusing existing ScheduleEditor) and performance stats (using existing reporting service).

Purpose: Give admins a dedicated view for each worker with schedule management and performance visibility, mirroring the customer detail page UX.
Output: Worker detail page at /admin/workers/[id] with schedule editing and stats.
</objective>

<execution_context>
@/Users/anthonylee/.claude/get-shit-done/workflows/execute-plan.md
@/Users/anthonylee/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/[locale]/(admin)/admin/customers/[id]/page.tsx (pattern reference - server component)
@app/[locale]/(admin)/admin/customers/[id]/customer-detail.tsx (pattern reference - client detail component with SWR + tabs)
@app/api/admin/customers/[id]/route.ts (pattern reference - API route)
@app/[locale]/(admin)/admin/workers/[id]/schedule/schedule-editor.tsx (reuse for schedule tab)
@app/[locale]/(admin)/admin/workers/worker-table.tsx (add link to detail page)
@src/lib/services/reporting.service.ts (getWorkerMetrics for performance stats)
@src/lib/types/reporting.ts (WorkerMetric type)
@app/api/admin/workers/[id]/schedule/route.ts (existing schedule API)
</context>

<tasks>

<task type="auto">
  <name>Task 1: API route and server page for worker detail</name>
  <files>
    app/api/admin/workers/[id]/route.ts
    app/[locale]/(admin)/admin/workers/[id]/page.tsx
    messages/en.json
    messages/ja.json
  </files>
  <action>
1. Create `app/api/admin/workers/[id]/route.ts` — GET endpoint (follow customers/[id]/route.ts pattern):
   - Auth guard via getAdminSession, return 401 if not admin
   - Fetch worker by ID with prisma.worker.findUnique, include: schedules (where specificDate is null, ordered by dayOfWeek asc), _count of bookings (where status='CONFIRMED')
   - Also call getWorkerMetrics from reporting.service.ts with startDate=30 days ago, endDate=now, then filter the result to find this worker's metrics
   - Return JSON: { id, name, nameEn, isActive, createdAt, updatedAt, schedules (mapped to DaySchedule[]), stats: { totalRevenue, bookingCount, averagePerBooking } }
   - Return 404 if worker not found, 500 on error

2. Create `app/[locale]/(admin)/admin/workers/[id]/page.tsx` — server component (follow customers/[id]/page.tsx pattern exactly):
   - Auth guard, redirect to login if not admin
   - Await params for locale and id
   - Render Card with WorkerDetail client component, passing workerId and locale
   - Use getTranslations('admin.workerDetail') for title

3. Add i18n messages under `admin.workerDetail` namespace in both en.json and ja.json:
   - English: title "Worker Detail", backToList "Back to Workers", schedule "Schedule", performance "Performance", totalRevenue "Total Revenue (30d)", bookingCount "Bookings (30d)", avgPerBooking "Avg per Booking", noBookings "No bookings in period", notFound "Worker not found", name "Name", nameEn "English Name", status "Status", createdAt "Created"
   - Japanese: title "スタッフ詳細", backToList "スタッフ一覧に戻る", schedule "スケジュール", performance "実績", totalRevenue "売上 (30日)", bookingCount "予約数 (30日)", avgPerBooking "予約単価", noBookings "期間中の予約なし", notFound "スタッフが見つかりません", name "名前", nameEn "英語名", status "ステータス", createdAt "登録日"
  </action>
  <verify>
    Run `npx tsc --noEmit` to confirm no type errors. Verify the API route file and page file exist.
  </verify>
  <done>GET /api/admin/workers/[id] returns worker data with schedules and stats. Server page renders with auth guard.</done>
</task>

<task type="auto">
  <name>Task 2: Worker detail client component with schedule and stats tabs</name>
  <files>
    app/[locale]/(admin)/admin/workers/[id]/worker-detail.tsx
    app/[locale]/(admin)/admin/workers/worker-table.tsx
  </files>
  <action>
1. Create `app/[locale]/(admin)/admin/workers/[id]/worker-detail.tsx` — client component (follow customer-detail.tsx pattern):
   - Props: { workerId: string, locale: string }
   - SWR fetch from `/api/admin/workers/${workerId}` with same fetcher pattern as customer-detail
   - Loading state with Spinner, error state with "not found" message and back link
   - Top section (always visible): worker name (h2), grid showing nameEn, status badge (green active/red inactive), createdAt date
   - Tab navigation with two tabs: "schedule" and "performance" (use same tab button styling as customer-detail)
   - Schedule tab: Import and render ScheduleEditor from `../[id]/schedule/schedule-editor` (use relative import `./schedule/schedule-editor`... actually the schedule-editor is at `app/[locale]/(admin)/admin/workers/[id]/schedule/schedule-editor.tsx`). Pass workerId and the schedules array from API response as initialSchedules. Build the 7-day array the same way the schedule page.tsx does (fill missing days with defaults).
   - Performance tab: Display stats in a 3-column grid of stat cards:
     - Total Revenue: formatYen(stats.totalRevenue) — use same formatYen helper as customer-detail
     - Booking Count: stats.bookingCount
     - Avg per Booking: formatYen(stats.averagePerBooking)
     - If all stats are 0, show "noBookings" message
   - Use useTranslations('admin.workerDetail') for all labels

2. Update `app/[locale]/(admin)/admin/workers/worker-table.tsx`:
   - Import Link from 'next/link'
   - Make the worker name cell in the table a Link to `/${locale}/admin/workers/${worker.id}` (need to accept locale prop — add locale to WorkerTableProps, pass it from parent page)
   - Style the link with `text-primary-600 hover:underline` to indicate clickability
   - Note: WorkerTable needs locale prop added. Update `app/[locale]/(admin)/admin/workers/page.tsx` to pass locale={locale} to WorkerTable.
  </action>
  <verify>
    Run `npx tsc --noEmit` to confirm no type errors. Verify worker-detail.tsx exists and worker-table.tsx has Link import.
  </verify>
  <done>Worker detail page renders with worker info, schedule editor tab, and performance stats tab. Worker names in the list are clickable links to the detail page.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- Navigate to /admin/workers — worker names are clickable links
- Click a worker name — loads /admin/workers/[id] with worker info displayed
- Schedule tab shows the ScheduleEditor with current schedules, editing works
- Performance tab shows revenue/booking stats for the last 30 days
</verification>

<success_criteria>
- Worker detail page accessible at /admin/workers/[id]
- Worker info section shows name, English name, status, created date
- Schedule tab displays editable weekly schedule using existing ScheduleEditor
- Performance tab shows totalRevenue, bookingCount, avgPerBooking from reporting service
- Worker names in list page link to detail page
- All text internationalized in en.json and ja.json
</success_criteria>

<output>
After completion, create `.planning/quick/3-worker-detail-page-with-schedule-editing/3-SUMMARY.md`
</output>
