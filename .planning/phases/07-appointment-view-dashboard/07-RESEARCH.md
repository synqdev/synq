# Phase 7: Appointment View & Dashboard Integration - Research

**Researched:** 2026-03-07
**Domain:** Next.js App Router tabbed layouts, sidebar navigation, dashboard card UI, admin settings
**Confidence:** HIGH

## Summary

Phase 7 builds the appointment "workstation" -- a per-appointment page at `/{locale}/appointment/{id}` with four tabs (Recording, Karute, Customer info, Settings), a dark navy sidebar navigation, and dashboard integration showing today's appointments with quick actions. It also adds a global admin settings page at `/admin/settings`.

The codebase already has all the building blocks: `RecordingPanel`, `KaruteEditor`, `ChatPanel/ChatProvider`, `CustomerDetail`, `Card`/`Button`/`Spinner` UI components, SWR data fetching patterns, admin auth via JWT/jose, and full i18n with `next-intl`. The Booking model already links to Customer, Worker, Service, KaruteRecord, and RecordingSession. The main work is composing these existing components into new page layouts, creating the sidebar navigation component, building the appointment cards for the dashboard, and adding the settings page.

Key architectural decision: the appointment page lives OUTSIDE the `(admin)` route group since it needs its own layout (dark navy sidebar instead of the standard admin nav). It will be at `app/[locale]/appointment/[id]/` with its own layout.tsx that provides the sidebar. The dashboard "Today's appointments" tab integrates into the existing dashboard tab system via the `TimetableWithTabs` component's tab mechanism.

**Primary recommendation:** Use Next.js App Router parallel/nested layouts to isolate the appointment page's sidebar layout from the admin dashboard layout. Compose existing components (RecordingPanel, KaruteEditor, CustomerDetail) within a client-side tab switcher. Use SWR for appointment data fetching with booking+karute status enrichment.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Four tabs: Recording, Karute, Customer info, Settings
- Appointment summary bar at top (above tabs): customer name, service, worker, time, status -- all at a glance
- Tablet-first responsive design -- optimize for iPad (staff uses tablet during appointment). Tabs stack vertically on small screens.
- New "Today" or "Appointments" tab added to existing admin dashboard (does not replace it)
- Today's appointments displayed as vertical list of cards -- each shows customer, time, service, karute status
- Quick actions on each card: Open appointment page, Start recording, View karute, Customer profile link
- Dark navy sidebar appears only on appointment pages (context-specific, replaces normal admin nav)
- Sidebar links: Back to dashboard, Tab shortcuts (Recording/Karute/Customer/Settings), AI Chat panel trigger, Previous/Next appointment navigation
- Previous/Next lets staff move between today's appointments without returning to dashboard
- Global admin settings page at /admin/settings (applies to whole shop)
- Configurable: AI provider selection, business type templates (karute categories), recording preferences (audio quality, auto-transcribe, language), staff management (karute access)
- Settings are global defaults, not per-appointment overrides

### Claude's Discretion
- Sidebar icon choices and hover states
- Card component design for today's appointments
- Tab transition animations
- Settings form layout and validation
- How the "Settings" tab in appointment view links to global settings

### Deferred Ideas (OUT OF SCOPE)
- Per-appointment settings overrides (e.g., different AI provider per session) -- global settings are enough for MVP
- Appointment page for non-admin roles (customer view of their appointment) -- future feature
- Calendar integration (Google Calendar, Apple Calendar sync) -- separate phase
</user_constraints>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | ^15.5.12 | App Router, layouts, server components | Already the project framework |
| next-intl | ^4.8.2 | i18n for en/ja | Already used throughout |
| swr | ^2.4.0 | Client data fetching for appointment/booking data | Already used in KaruteEditor, CustomerDetail |
| zod | ^4.3.6 | Settings form validation | Already used for all validation |
| tailwindcss | ^4.1.18 | Styling, dark navy sidebar | Already used throughout |

### Existing Components to Compose
| Component | Location | Used For |
|-----------|----------|----------|
| RecordingPanel | `src/components/recording/RecordingPanel.tsx` | Recording tab content |
| KaruteEditor | `src/components/karute/KaruteEditor.tsx` | Karute tab content |
| ChatPanel/ChatProvider | `src/components/chat/` | AI Chat trigger from sidebar |
| CustomerDetail | `app/[locale]/(admin)/admin/customers/[id]/customer-detail.tsx` | Customer info tab (may need extraction) |
| Card, Button, Spinner, Select | `src/components/ui/` | General UI |

### No New Dependencies Required
This phase composes existing components and creates new page layouts. No new npm packages are needed.

## Architecture Patterns

### Recommended Route Structure
```
app/
  [locale]/
    (admin)/
      admin/
        dashboard/
          page.tsx              # Existing - add "Today" tab
        settings/
          page.tsx              # NEW: Global admin settings
    appointment/
      [id]/
        layout.tsx              # NEW: Dark navy sidebar layout
        page.tsx                # NEW: Appointment workstation (tabbed)
```

**Why appointment is outside (admin) route group:** The appointment page needs a completely different layout (dark navy sidebar) compared to the admin pages (header tabs via TimetableWithTabs). Using a separate route segment at `app/[locale]/appointment/[id]/` avoids the admin layout wrapper while still being under the `[locale]` layout for i18n.

**Auth note:** The appointment route is outside the `(admin)` group but still needs admin auth. The middleware already checks `pathname.match(/^\/[a-z]{2}\/admin\/(?!login)/)` for admin routes. Either: (a) update the middleware regex to also cover `/appointment/`, or (b) handle auth in the page's server component (like other admin pages do with `getAdminSession()`). Option (b) is simpler and consistent with the codebase pattern.

### Pattern 1: Appointment Page with Client-Side Tabs
**What:** A server component page that loads appointment data, wraps a client component with tab switching
**When to use:** When multiple views share the same data context

```typescript
// app/[locale]/appointment/[id]/page.tsx (server component)
import { getAdminSession } from '@/lib/auth/admin'
import { prisma } from '@/lib/db/client'
import { AppointmentWorkstation } from './appointment-workstation'

export default async function AppointmentPage({ params }: PageProps) {
  const { locale, id } = await params
  const isAdmin = await getAdminSession()
  if (!isAdmin) redirect(`/${locale}/admin/login`)

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      customer: true,
      worker: true,
      service: true,
      karuteRecords: { orderBy: { createdAt: 'desc' }, take: 1 },
      recordingSessions: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  if (!booking) notFound()

  return <AppointmentWorkstation booking={booking} locale={locale} />
}
```

```typescript
// app/[locale]/appointment/[id]/appointment-workstation.tsx (client component)
'use client'
import { useState } from 'react'
import { RecordingPanel } from '@/components/recording/RecordingPanel'
import { KaruteEditor } from '@/components/karute/KaruteEditor'

type Tab = 'recording' | 'karute' | 'customer' | 'settings'

export function AppointmentWorkstation({ booking, locale }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('recording')

  return (
    <div className="flex h-screen">
      {/* Sidebar rendered by layout.tsx */}
      <div className="flex-1 flex flex-col">
        {/* Summary bar */}
        <AppointmentSummaryBar booking={booking} />
        {/* Tab content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'recording' && (
            <RecordingPanel
              customerId={booking.customerId}
              workerId={booking.workerId}
              bookingId={booking.id}
              karuteRecordId={booking.karuteRecords[0]?.id}
            />
          )}
          {activeTab === 'karute' && booking.karuteRecords[0] && (
            <KaruteEditor
              recordId={booking.karuteRecords[0].id}
              locale={locale}
            />
          )}
          {/* ... other tabs */}
        </div>
      </div>
    </div>
  )
}
```

### Pattern 2: Dark Navy Sidebar Layout
**What:** A layout component specific to appointment pages with dark navy styling
**When to use:** Context-specific navigation that replaces the global admin nav

```typescript
// app/[locale]/appointment/[id]/layout.tsx
import { ChatWrapper } from '@/components/chat/ChatWrapper'

export default function AppointmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <ChatWrapper>
        <div className="flex flex-1">
          {/* Sidebar is rendered inside the client workstation component
              because it needs access to appointment state (active tab, booking id) */}
          {children}
        </div>
      </ChatWrapper>
    </div>
  )
}
```

**Important:** The sidebar must be part of the client component (not the layout) because it needs to:
1. Know which tab is active (to highlight the current tab link)
2. Know the booking ID (for prev/next navigation)
3. Trigger ChatPanel open (via useChatContext)

### Pattern 3: Dashboard Today's Appointments Tab
**What:** A new tab in the existing dashboard showing today's appointments as cards
**When to use:** Extending the existing tab-based dashboard

The existing dashboard uses `TimetableWithTabs` with a `panelContent` prop for embedded tabs (workers, services, resources, customers, reports). Adding a "today" tab follows the exact same pattern:

```typescript
// In prototype-client.tsx, add to tabs array:
{ id: 'today', label: 'Today', icon: 'calendar' }

// Add to embeddedPanelTabs:
const embeddedPanelTabs = new Set([..., 'today'])

// Add panel content:
activeTabId === 'today' ? (
  <TodayAppointments
    bookings={bars}
    locale={locale}
    dateStr={activeDateStr}
  />
) : ...
```

### Pattern 4: Settings Page with Form Sections
**What:** A standard admin page at /admin/settings with grouped form sections
**When to use:** Global configuration that persists to database or env

```typescript
// Settings can be stored in a new AdminSettings model or a simple JSON config
// For MVP, a single-row settings table works well:
model AdminSettings {
  id        String   @id @default("default")
  aiProvider    String   @default("openai")
  businessType  String   @default("general")
  autoTranscribe Boolean @default(true)
  recordingLang  String  @default("ja")
  updatedAt DateTime @updatedAt
}
```

### Anti-Patterns to Avoid
- **Don't create a separate route group for appointment:** Using `(appointment)` route group adds unnecessary complexity. Just use `app/[locale]/appointment/[id]/` directly.
- **Don't duplicate CustomerDetail component:** Extract shared logic from the existing `customer-detail.tsx` into a reusable component or import it directly. The customer info tab should reuse existing UI.
- **Don't put sidebar in layout.tsx as a server component:** The sidebar needs client state (active tab, chat trigger). It should be part of the client workstation component.
- **Don't build custom data fetching for today's appointments:** The dashboard already has booking data via `initialBookings` and `useCalendarPolling`. Reuse this data for the "Today" tab.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab switching | Custom tab state management | Simple useState with conditional rendering | Existing codebase pattern (dashboard tabs) |
| Appointment data fetching | Custom fetch + cache | SWR with existing API endpoints | Consistent with KaruteEditor, CustomerDetail |
| Settings persistence | File-based config | Prisma model (AdminSettings) | Database is already the single source of truth |
| Sidebar responsive collapse | Custom media query logic | Tailwind responsive classes (hidden/block) | Tailwind handles this natively |
| Previous/Next appointment nav | Custom sorting/fetching | API endpoint returning today's bookings ordered by time | Server does the ordering |

## Common Pitfalls

### Pitfall 1: Appointment Page Missing KaruteRecord
**What goes wrong:** When navigating to a new appointment that hasn't been recorded yet, there's no KaruteRecord to display in the Karute tab.
**Why it happens:** KaruteRecord is created when recording starts (via `createRecordingSessionAction`), not when the appointment is booked.
**How to avoid:** Handle the "no karute yet" state in the Karute tab. Show a prompt to start recording first, or provide a "Create Karute" button that creates an empty KaruteRecord linked to the booking.
**Warning signs:** Null karuteRecordId passed to KaruteEditor.

### Pitfall 2: Layout Nesting with ChatWrapper
**What goes wrong:** ChatWrapper is already in the `(admin)` layout. If the appointment layout also includes ChatWrapper, the ChatProvider context is duplicated.
**Why it happens:** The appointment route is outside `(admin)` so it doesn't inherit the admin layout's ChatWrapper.
**How to avoid:** The appointment layout needs its own ChatWrapper since it's outside the (admin) route group. This is correct -- each layout provides its own context. The sidebar's "AI Chat" button uses `useChatContext()` from the appointment layout's ChatProvider.

### Pitfall 3: Middleware Not Protecting Appointment Routes
**What goes wrong:** The appointment page at `/ja/appointment/123` is accessible without admin login because middleware only checks `/admin/` routes.
**Why it happens:** Middleware regex is `pathname.match(/^\/[a-z]{2}\/admin\/(?!login)/)` which doesn't match `/appointment/`.
**How to avoid:** Either update middleware regex to include appointment routes, or rely on server-component auth check with `getAdminSession()` (consistent with how all pages already work). Recommendation: do both for defense-in-depth.

### Pitfall 4: CustomerDetail Component Tightly Coupled
**What goes wrong:** The existing `CustomerDetail` component in `customers/[id]/customer-detail.tsx` is tightly coupled to its page (expects workers prop, has chat integration, manages its own SWR fetch).
**Why it happens:** It was built for a specific page context.
**How to avoid:** For the appointment's Customer tab, either: (a) create a lighter `CustomerInfoPanel` component that takes customer data as props (from the already-fetched booking.customer), or (b) reuse CustomerDetail by passing the customerId and letting it fetch its own data. Option (a) is better for the appointment context since we already have the customer data.

### Pitfall 5: Previous/Next Navigation with Stale Data
**What goes wrong:** Previous/Next appointment buttons navigate to appointments that may have been cancelled since the page loaded.
**Why it happens:** Today's appointment list is fetched once and can become stale.
**How to avoid:** Fetch today's appointments for the same worker on each navigation, or use SWR revalidation. The existing `useCalendarPolling` hook polls every 10 seconds, which could be adapted.

### Pitfall 6: Settings Model Migration
**What goes wrong:** Adding a new Prisma model requires a database migration, which can break if not handled carefully.
**Why it happens:** `prisma db push` can reset data in development, and production needs proper migrations.
**How to avoid:** The project uses `prisma db push` (not migrate). Add the AdminSettings model and run `prisma db push`. Seed a default row in the seed script.

## Code Examples

### Appointment Summary Bar
```typescript
// Verified pattern from existing codebase (KaruteEditor header style)
function AppointmentSummaryBar({ booking, locale }: { booking: BookingData; locale: string }) {
  const t = useTranslations('admin.appointment')

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">
          {booking.customer.name}
        </span>
      </div>
      <div className="text-sm text-gray-600">{booking.service.name}</div>
      <div className="text-sm text-gray-600">{booking.worker.name}</div>
      <div className="text-sm text-gray-600">
        {formatTime(booking.startsAt)} - {formatTime(booking.endsAt)}
      </div>
      <StatusBadge status={booking.status} />
    </div>
  )
}
```

### Dark Navy Sidebar
```typescript
// Sidebar component inside appointment workstation
function AppointmentSidebar({
  activeTab,
  onTabChange,
  bookingId,
  locale,
  todayBookingIds,
}: SidebarProps) {
  const { setIsOpen } = useChatContext()
  const currentIndex = todayBookingIds.indexOf(bookingId)

  const navItems = [
    { id: 'recording', icon: MicIcon, label: t('recording') },
    { id: 'karute', icon: ClipboardIcon, label: t('karute') },
    { id: 'customer', icon: UserIcon, label: t('customer') },
    { id: 'settings', icon: SettingsIcon, label: t('settings') },
  ]

  return (
    <aside className="flex w-16 flex-col items-center bg-[#1a2332] py-4 md:w-56">
      {/* Back to dashboard */}
      <Link href={`/${locale}/admin/dashboard`}
        className="mb-6 text-gray-400 hover:text-white">
        <ArrowLeftIcon className="h-5 w-5" />
      </Link>

      {/* Tab shortcuts */}
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={`w-full px-3 py-2.5 text-sm ${
            activeTab === item.id
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
          }`}
        >
          <item.icon className="h-5 w-5" />
          <span className="hidden md:inline ml-3">{item.label}</span>
        </button>
      ))}

      {/* AI Chat trigger */}
      <button onClick={() => setIsOpen(true)}
        className="mt-auto text-gray-400 hover:text-white">
        <ChatIcon className="h-5 w-5" />
      </button>

      {/* Prev/Next navigation */}
      <div className="mt-4 flex gap-2">
        {currentIndex > 0 && (
          <Link href={`/${locale}/appointment/${todayBookingIds[currentIndex - 1]}`}>
            <ChevronUpIcon />
          </Link>
        )}
        {currentIndex < todayBookingIds.length - 1 && (
          <Link href={`/${locale}/appointment/${todayBookingIds[currentIndex + 1]}`}>
            <ChevronDownIcon />
          </Link>
        )}
      </div>
    </aside>
  )
}
```

### Today's Appointments Card
```typescript
// Dashboard card for today's appointments tab
function AppointmentCard({ booking, locale }: { booking: BookingWithStatus; locale: string }) {
  const hasKarute = booking.karuteStatus !== null

  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-semibold text-gray-900">
            {formatTime(booking.startsAt)}
          </div>
          <div className="text-xs text-gray-500">
            {formatTime(booking.endsAt)}
          </div>
        </div>
        <div>
          <div className="font-medium text-gray-900">{booking.customerName}</div>
          <div className="text-sm text-gray-500">{booking.serviceName}</div>
        </div>
        {/* Karute status indicator */}
        <span className={`rounded-full px-2 py-0.5 text-xs ${
          hasKarute ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {hasKarute ? 'Karute' : 'No karute'}
        </span>
      </div>
      <div className="flex gap-2">
        <Link href={`/${locale}/appointment/${booking.id}`}>
          <Button size="sm" variant="outline">Open</Button>
        </Link>
      </div>
    </div>
  )
}
```

### API Endpoint for Appointment Data
```typescript
// GET /api/admin/appointment/[id]
// Returns booking with all related data needed for the appointment workstation
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true, locale: true, notes: true } },
      worker: { select: { id: true, name: true, nameEn: true } },
      service: { select: { id: true, name: true, nameEn: true, duration: true } },
      karuteRecords: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, createdAt: true },
      },
      recordingSessions: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, startedAt: true },
      },
    },
  })

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(booking)
}
```

### Today's Bookings API (for sidebar prev/next)
```typescript
// GET /api/admin/appointment/today?date=2026-03-07
// Returns ordered list of today's booking IDs for prev/next navigation
export async function GET(request: NextRequest) {
  const isAdmin = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dateStr = request.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0]
  const startOfDay = toZonedTime(dateStr, '00:00')
  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)

  const bookings = await prisma.booking.findMany({
    where: {
      startsAt: { gte: startOfDay, lt: endOfDay },
      status: { not: 'CANCELLED' },
    },
    select: {
      id: true,
      startsAt: true,
      customerId: true,
      customer: { select: { name: true } },
      service: { select: { name: true } },
      karuteRecords: { select: { id: true, status: true }, take: 1 },
    },
    orderBy: { startsAt: 'asc' },
  })

  return NextResponse.json({ bookings })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Page-level route for each tab | Client-side tab switching within single page | Standard in App Router | Faster tab switching, shared data context |
| Separate layout per admin sub-section | Route groups with shared layouts | Next.js 13+ | The `(admin)` group already does this |
| Server-side form handling | Server actions + client forms | Next.js 14+ | This project uses both patterns |

**Current patterns in codebase:**
- Server component pages with auth check -> client component with data
- SWR for client-side data fetching with `revalidateOnFocus: false`
- Custom UI components (Card, Button, Select, Spinner) -- not Shadcn
- Tab-based navigation via `TimetableWithTabs` component in dashboard
- Inline SVG icons (no icon library installed)

## Open Questions

1. **AdminSettings Prisma Model**
   - What we know: Settings need persistence (AI provider, business type, recording prefs)
   - What's unclear: Whether to use a single-row settings table or environment variables
   - Recommendation: Use a Prisma model (AdminSettings) with a single "default" row. This allows runtime changes without redeployment. Env vars can serve as initial defaults.

2. **CustomerDetail Component Reuse**
   - What we know: The existing CustomerDetail is feature-rich but page-specific
   - What's unclear: How much of CustomerDetail should be shown in the appointment's Customer tab
   - Recommendation: Create a lighter `CustomerInfoPanel` component for the appointment context that shows key info (name, email, phone, notes, visit count, last visit) without the full booking history and edit capabilities. The Customer tab can link to the full customer detail page for edits.

3. **Prev/Next Appointment Scope**
   - What we know: Previous/Next should navigate between today's appointments
   - What's unclear: Should it be filtered to the same worker, or all workers?
   - Recommendation: All workers (the sidebar helps the admin/owner manage the whole shop's schedule). Pass the full list of today's booking IDs to the sidebar.

4. **Settings Tab in Appointment View**
   - What we know: One of the four tabs is "Settings"
   - What's unclear: Whether it shows inline settings or just links to /admin/settings
   - Recommendation: Show a brief summary of current settings with a "Manage Settings" link to the full /admin/settings page. This keeps the appointment page focused.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** -- Direct reading of all relevant files:
  - `app/[locale]/(admin)/layout.tsx` -- Admin layout with ChatWrapper
  - `app/[locale]/(admin)/admin/dashboard/page.tsx` -- Dashboard server component pattern
  - `app/[locale]/(admin)/admin/dashboard/prototype-client.tsx` -- Tab system, booking data flow
  - `src/components/recording/RecordingPanel.tsx` -- Recording component props/interface
  - `src/components/karute/KaruteEditor.tsx` -- Karute component props/interface
  - `src/components/chat/ChatPanel.tsx` -- Chat slide-over pattern
  - `src/components/chat/ChatProvider.tsx` -- Chat context pattern
  - `app/[locale]/(admin)/admin/customers/[id]/customer-detail.tsx` -- Customer detail pattern
  - `app/api/admin/calendar/route.ts` -- API route pattern with auth
  - `prisma/schema.prisma` -- Full data model (Booking, KaruteRecord, RecordingSession relations)
  - `src/lib/auth/admin.ts` -- Auth utilities
  - `middleware.ts` -- Route protection regex
  - `src/i18n/routing.ts` -- Locale configuration (ja, en)
  - `tailwind.config.ts` -- Color palette (primary, secondary, success scales)
  - `package.json` -- All dependencies (no new packages needed)

### Secondary (MEDIUM confidence)
- Next.js App Router documentation -- Route groups, layouts, parallel routes (verified via training knowledge, consistent with codebase usage)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies needed, all components already exist
- Architecture: HIGH -- Patterns verified directly from codebase analysis
- Pitfalls: HIGH -- Identified from actual code inspection (middleware regex, ChatWrapper nesting, CustomerDetail coupling)
- Settings model: MEDIUM -- AdminSettings table design is a reasonable approach but exact fields need validation during implementation

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable -- no fast-moving external dependencies)
