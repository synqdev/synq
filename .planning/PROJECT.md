# SYNQ

## What This Is

A reservation and booking system for wellness businesses (seitai, massage, yoga, pilates) in Japan. Japanese-first with English support. Enables customers to book appointments online while managing the "double bottleneck" constraint of worker availability AND physical resource (bed) capacity.

## Core Value

**A slot is only bookable when BOTH the worker is free AND a physical resource (bed) is available.** This double-bottleneck logic prevents overbooking and ensures the shop can physically serve every confirmed booking.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**User Booking Flow:**
- [ ] User can enter email, name, and phone number
- [ ] User receives email verification code
- [ ] User account is created upon successful verification (lazy auth - no password)
- [ ] User can view single-day timeline calendar with all workers' availability
- [ ] Available slots respect double-bottleneck logic (worker free AND beds available)
- [ ] User can select an available time slot
- [ ] User receives confirmation page after booking
- [ ] User receives email confirmation with booking details

**Admin Flow:**
- [ ] Admin can log in via basic auth (env var credentials)
- [ ] Admin can view calendar with booking details (customer name, service info)
- [ ] Admin can block time slots for specific workers
- [ ] Admin can override/edit existing appointments

**Core Infrastructure:**
- [ ] Multi-tenant-ready database schema (single shop for Phase 1)
- [ ] Worker management (name, availability)
- [ ] Resource management (beds with total count)
- [ ] Service definition (60-min massage for Phase 1)
- [ ] i18n support with Japanese and English locales

### Out of Scope

- SMS verification — email first, add SMS later
- Customer choosing service duration — fixed 60-min for Phase 1
- Customer choosing specific worker — show all, but no preference filtering yet
- Multi-session tickets (回数券) — future milestone
- Customer ranking/loyalty tiers — future milestone
- Dynamic pricing — future milestone
- Customer app (My Page) — future milestone
- Sales reporting — future milestone
- Hot Pepper integration — future milestone (also carries risk of unofficial API)
- Payment processing — future milestone

## Context

**Target Market:** Wellness businesses in Japan (seitai, massage studios, yoga/pilates studios). Staff currently manage bookings via spreadsheets and want to focus on their core work (improving customer health).

**The Double Bottleneck Problem:** Unlike simple appointment systems, wellness businesses have TWO constraints:
1. **Human constraint:** Each worker can only serve one customer at a time
2. **Physical constraint:** The shop has limited beds/stations (e.g., 3 massage beds)

Even if Worker A is free at 2pm, if all 3 beds are occupied by Workers B, C, D's appointments, the slot is unavailable.

**Development Approach:** Build in English first, Japanese UI/UX from the start. Locale routing via `/ja/...` and `/en/...`.

**Reference Materials:**
- `SYNQ.pdf` — Full product vision mindmap (customer management, rankings, dynamic pricing, etc.)
- `userview.png` — User calendar mockup (single-day timeline, workers as rows)
- `adminview.png` — Admin calendar mockup (shows booking details, color-coded statuses)

## Constraints

- **Framework:** Next.js 15 (App Router) — Avoid v16 due to CVE-2025-66478
- **Language:** TypeScript with strict mode
- **Database:** Supabase (hosted PostgreSQL)
- **ORM:** Prisma
- **Styling:** Tailwind CSS with custom UI components (no component library)
- **i18n:** next-intl with route-based locales (`/[locale]/...`)
- **State:** SWR with polling strategy for live calendar updates
- **Admin Auth:** Basic auth via middleware gate (credentials in env vars)
- **Guest Auth:** Lazy auth — email/phone matching, no password required

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Email verification over SMS | Simpler implementation, no third-party SMS costs | — Pending |
| Single shop first, multi-tenant schema | Faster to ship, architecture supports growth | — Pending |
| Custom UI components over Shadcn | Leaner bundle, full control over styling | — Pending |
| SWR polling for live calendar | Simple real-time-ish updates without WebSocket complexity | — Pending |
| Lazy auth for guests | Reduces friction — no password to remember, just verify email | — Pending |
| TypeScript strict mode | Booking logic is complex, type safety prevents runtime bugs | — Pending |

---
*Last updated: 2025-02-04 after initialization*
