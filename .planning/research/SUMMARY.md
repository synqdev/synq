# Research Summary: SYNQ

**Synthesized:** 2026-02-04
**Confidence:** HIGH

## Executive Summary

SYNQ is a wellness booking system for Japanese markets with a unique **double-bottleneck scheduling challenge** requiring BOTH worker availability AND physical resource (bed) capacity. Research validates the chosen stack (Next.js 15, Supabase, Prisma) and identifies critical success factors.

**Key Findings:**
1. **Race condition prevention is critical** — Use serializable transactions + database constraints
2. **Japanese timezone handling** — Store UTC with timestamptz, display in JST using date-fns-tz
3. **Row-Level Security is mandatory** — 83% of Supabase breaches involve RLS misconfiguration
4. **Mobile-first is non-negotiable** — 90%+ traffic from mobile in Japan

## Critical Consensus (All Research Agrees)

| Pattern | Stack | Architecture | Pitfalls | Action |
|---------|-------|--------------|----------|--------|
| Serializable transactions | ✅ | ✅ | ✅ | Phase 1 (non-negotiable) |
| Timezone discipline | ✅ | ✅ | ✅ | Phase 1 |
| RLS security | ✅ | ✅ | ✅ | Phase 1 |
| Mobile-first UI | — | — | ✅ | Phase 1 |
| Email confirmations | ✅ | — | ✅ | Phase 1 |

## Stack Validation

**Confirmed (HIGH confidence):**
- Next.js 15.5 LTS (avoid v16 - CVE-2025-66478)
- Prisma 7.x with serializable transactions
- Supabase with RLS policies
- Tailwind v3 (defer v4 to Q3 2025)
- date-fns v4 (native timezone support via TZDate)
- SWR for polling-based calendar updates

**Recommended additions:**
- Resend for email (monitor delivery, have SendGrid backup)
- react-day-picker for calendar UI (shadcn compatible)
- React Hook Form + Zod for validation

## Architecture Patterns

**Must implement in Phase 1:**

1. **Transaction-wrapped booking creation**
   - Check worker availability + resource capacity atomically
   - Use `isolationLevel: 'Serializable'` in Prisma
   - Handle P2034 errors with retry logic

2. **Pre-query availability calculation**
   - Calculate available slots server-side before presenting to user
   - Never let client see unavailable slots
   - Filter where BOTH worker free AND bed available

3. **Route segment separation**
   - `app/(public)/` for customer-facing routes
   - `app/(admin)/` for admin routes with auth middleware

**Critical indexes:**
```prisma
@@index([startsAt, endsAt])
@@index([workerId, startsAt, endsAt])
@@index([resourceId, startsAt, endsAt])
```

## Feature Prioritization

### Table Stakes (Must Have Phase 1)
- Online booking calendar
- Email confirmations
- Service menu
- Appointment cancellation
- Customer contact capture
- Mobile-responsive booking
- Timezone handling
- Double-bottleneck logic

### Differentiators (Phase 2-3)
- LINE notification integration (Japan-specific)
- Staff designation (request specific therapist)
- Waitlist management
- Multi-service booking
- Cancellation policies with time windows

### Defer to v2+
- Multi-session tickets (回数券) — HIGH complexity
- Loyalty tiers — HIGH complexity
- Dynamic pricing — MEDIUM complexity
- Online payments — PCI compliance concerns
- Recurring bookings — Series management

## Pitfalls to Avoid

### CRITICAL (Phase 1 blockers)

| Pitfall | Impact | Prevention |
|---------|--------|------------|
| Race conditions | Double bookings | Serializable transactions + DB constraints |
| Timezone bugs | Bookings 9 hours off | timestamptz + date-fns-tz |
| Missing RLS | Data breach | Enable on ALL tables before deploy |
| Email failures | High no-shows | Transactional email + SPF/DKIM |
| Mobile breaks | Can't book on mobile | 44px touch targets, mobile-first |

### MODERATE (Phase 1-2)

| Pitfall | Impact | Prevention |
|---------|--------|------------|
| Stale SWR data | Failed bookings | 5s revalidation, not 30s |
| No cancellation policy | Revenue loss | 24hr notice + reminders |
| Security gaps | Breach risk | MFA for admin, rate limiting |

## Phase Structure Recommendation

### Phase 1: Core Booking MVP
- Database schema with proper indexes
- RLS policies enabled
- User registration with email verification
- Double-bottleneck availability calculation
- Booking with serializable transactions
- Mobile-first calendar UI
- Email confirmations
- Basic cancellation

### Phase 2: Admin Tools
- Admin auth + dashboard
- Worker schedule management
- Booking management (view, edit, cancel)
- Staff calendar view
- No-show tracking

### Phase 3: Japanese Market
- LINE notification integration
- Japanese localization polish
- Cancellation policy enforcement
- Waitlist management

### Phase 4: Advanced (v2+)
- Multi-session tickets
- Loyalty program
- Online payments
- Recurring bookings

## Research Flags

**Needs phase-specific research:**
- LINE API integration (Phase 3)
- Japanese payment gateways (Phase 4)
- WebSocket implementation (if real-time needed)

**Standard patterns (skip research):**
- Core booking flow (well-documented)
- Authentication & RLS (Supabase docs)
- Calendar UI (react-day-picker)
- Admin CRUD (standard Next.js)

## Open Questions

### Must answer before Phase 1:
1. Service menu schema — how do services relate to workers/resources?
2. Cancellation policy values — 24hr? 48hr? Charge percentage?
3. Email service — Start Resend, monitor, have SendGrid backup?

### Can decide during development:
1. Calendar component — react-day-picker sufficient for MVP?
2. Booking history depth — all time or last 6 months?
3. Customer notes — free text or structured tags?

## Sources

**HIGH confidence sources:**
- Prisma Official Docs (transactions)
- Supabase Official Docs (RLS)
- Next.js 15 Official Docs (App Router)
- CVE-2025-48757 (Supabase RLS breaches)

**MEDIUM confidence sources:**
- Booking system case studies (GeeksforGeeks, Vertabelo)
- Japan localization guides
- Industry no-show rate research

---
*Ready for requirements definition and roadmap creation.*
