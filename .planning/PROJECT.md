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

**Database Schema:**

```prisma
model Shop {
  id        String   @id @default(uuid())
  name      String
  timezone  String   @default("Asia/Tokyo") // IANA timezone
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}

enum BookingStatus {
  CONFIRMED
  CANCELLED
  NOSHOW
}

model Service {
  id          String    @id @default(uuid())
  shopId      String
  name        String    // Primary (Japanese) e.g., "指圧"
  nameEn      String?   // Fallback (English) e.g., "Shiatsu"
  description String?
  duration    Int       // Minutes
  price       Int       // Yen
  isActive    Boolean   @default(true)
  deletedAt   DateTime?
  bookings    Booking[]

  @@index([shopId])
}

model Worker {
  id          String           @id @default(uuid())
  shopId      String
  name        String           // e.g., "Tanaka"
  nameEn      String?          // e.g., "Tanaka" (English display)
  isActive    Boolean          @default(true)
  deletedAt   DateTime?
  bookings    Booking[]
  schedules   WorkerSchedule[]

  @@index([shopId])
}

model WorkerSchedule {
  id           String    @id @default(uuid())
  workerId     String
  worker       Worker    @relation(fields: [workerId], references: [id])
  dayOfWeek    Int?      // 0=Sunday, 6=Saturday (recurring)
  specificDate DateTime? // One-off block/availability
  startTime    DateTime  // Store as 1970-01-01T09:00:00Z for time-of-day
  endTime      DateTime  // Store as 1970-01-01T18:00:00Z for time-of-day
  isAvailable  Boolean   @default(true) // false = blocked time

  @@index([workerId, dayOfWeek])
  @@index([workerId, specificDate])
}

model Resource {
  id          String    @id @default(uuid())
  shopId      String
  name        String    // e.g., "Bed 1"
  isActive    Boolean   @default(true)
  deletedAt   DateTime?
  bookings    Booking[]

  @@index([shopId])
}

model Customer {
  id                         String    @id @default(uuid())
  shopId                     String
  email                      String    @unique
  phone                      String?
  name                       String
  locale                     String    @default("ja") // "en" or "ja"
  isEmailVerified            Boolean   @default(false)
  emailVerificationCode      String?
  emailVerificationExpiresAt DateTime?
  notes                      String?   // Admin notes
  deletedAt                  DateTime?
  bookings                   Booking[]

  @@index([shopId])
}

model Booking {
  id          String        @id @default(uuid())
  shopId      String
  createdAt   DateTime      @default(now())
  startsAt    DateTime
  endsAt      DateTime
  status      BookingStatus @default(CONFIRMED)
  version     Int           @default(0) // Optimistic locking for concurrency
  deletedAt   DateTime?

  workerId    String
  worker      Worker    @relation(fields: [workerId], references: [id])

  resourceId  String
  resource    Resource  @relation(fields: [resourceId], references: [id])

  customerId  String
  customer    Customer  @relation(fields: [customerId], references: [id])

  serviceId   String
  service     Service   @relation(fields: [serviceId], references: [id])

  @@index([shopId, startsAt, endsAt])
  @@index([workerId, startsAt, endsAt])
  @@index([resourceId, startsAt, endsAt])
}
```

**Double-Bottleneck Logic:**
A slot is AVAILABLE if and only if:
1. **Worker Check:** No existing booking for that worker overlaps the time range
2. **Resource Check:** At least one Resource (bed) has no overlapping booking

Both checks run in a serializable transaction to prevent race conditions.

## Constraints

- **Framework:** Next.js 15 (App Router) — CVE-2025-66478 (critical RCE, CVSS 10.0) affects both 15.x and 16.x App Router; upgrade to patched releases (15.0.5+ or 16.0.7+). Rotate secrets if the app was public and unpatched as of Dec 4, 2025.
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
| SWR polling for live calendar (5–10s) | Simple real-time-ish updates without WebSocket complexity | — Pending |
| Lazy auth for guests | Reduces friction — no password to remember, just verify email | — Pending |
| TypeScript strict mode | Booking logic is complex, type safety prevents runtime bugs | — Pending |
| Individual Resource records | Track specific beds per booking (not just capacity count) | — Pending |
| WorkerSchedule model | Enables admin time blocking and recurring schedules | — Pending |
| Service layer separation | Business logic separate from API endpoints for testability | — Pending |
| RLS on all tables | Security best practice, prevents data leakage | — Pending |
| Jest for testing | Industry standard, good TypeScript support | — Pending |

---
*Last updated: 2025-02-04 after initialization*
