# Phase 7: Appointment View & Dashboard Integration - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Per-appointment page at `/{locale}/appointment/{id}` with tabbed interface for recording, karute, customer info, and settings. Dashboard integration showing today's appointments with quick karute access. Dark navy sidebar navigation for appointment-level interface. Global admin settings page for AI provider config and business type templates.

</domain>

<decisions>
## Implementation Decisions

### Appointment Page Layout
- Four tabs: Recording, Karute, Customer info, Settings
- Appointment summary bar at top (above tabs): customer name, service, worker, time, status — all at a glance
- Tablet-first responsive design — optimize for iPad (staff uses tablet during appointment). Tabs stack vertically on small screens.

### Dashboard Integration
- New "Today" or "Appointments" tab added to existing admin dashboard (does not replace it)
- Today's appointments displayed as vertical list of cards — each shows customer, time, service, karute status
- Quick actions on each card: Open appointment page, Start recording, View karute, Customer profile link

### Sidebar Navigation
- Dark navy sidebar appears only on appointment pages (context-specific, replaces normal admin nav)
- Sidebar links: Back to dashboard, Tab shortcuts (Recording/Karute/Customer/Settings), AI Chat panel trigger, Previous/Next appointment navigation
- Previous/Next lets staff move between today's appointments without returning to dashboard

### Settings Page
- Global admin settings page at /admin/settings (applies to whole shop)
- Configurable: AI provider selection (OpenAI, Gemini, etc.), business type templates (karute categories), recording preferences (audio quality, auto-transcribe, language), staff management (karute access)
- Settings are global defaults, not per-appointment overrides

### Claude's Discretion
- Sidebar icon choices and hover states
- Card component design for today's appointments
- Tab transition animations
- Settings form layout and validation
- How the "Settings" tab in appointment view links to global settings

</decisions>

<specifics>
## Specific Ideas

- Owner's prototype had a dark navy sidebar — adopt this aesthetic for the appointment context
- Appointment page is the main "workstation" for practitioners during a session — should feel focused and uncluttered
- Dashboard cards should make it obvious which appointments have karute records vs which still need them
- Previous/Next appointment navigation enables staff to move through their day's schedule efficiently

</specifics>

<deferred>
## Deferred Ideas

- Per-appointment settings overrides (e.g., different AI provider per session) — global settings are enough for MVP
- Appointment page for non-admin roles (customer view of their appointment) — future feature
- Calendar integration (Google Calendar, Apple Calendar sync) — separate phase

</deferred>

---

*Phase: 07-appointment-view-dashboard*
*Context gathered: 2026-03-07*
