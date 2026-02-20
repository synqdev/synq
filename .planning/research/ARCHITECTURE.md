# Architecture Patterns: Wellness Booking Systems

**Domain:** Wellness/Spa Appointment Booking System
**Researched:** 2026-02-04
**Confidence:** MEDIUM (WebSearch patterns + Prisma official docs)

## Executive Summary

Booking systems require careful architecture to handle the "double-bottleneck" problem: a slot is only available if BOTH the worker is free AND physical resources (beds) have capacity. This requires atomic transaction handling, efficient availability queries, and clear separation between public booking flows and admin management.

SYNQ's architecture must prioritize **concurrent booking prevention** and **efficient availability calculation** while maintaining separation between user-facing and admin concerns.

## Recommended Architecture

### High-Level Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 15 App Router                    │
├──────────────────────────┬──────────────────────────────────┤
│   Public App Routes      │      Admin App Routes            │
│   (/app/(public))        │      (/app/(admin))              │
├──────────────────────────┴──────────────────────────────────┤
│                  Server Actions Layer                        │
│  (Booking mutations, availability queries, validation)       │
├──────────────────────────────────────────────────────────────┤
│              Domain Service Layer (Optional)                 │
│  (Business logic: availability calculation, conflicts)       │
├──────────────────────────────────────────────────────────────┤
│                   Data Access Layer                          │
│              Prisma Client + PostgreSQL                      │
└──────────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With | Build Priority |
|-----------|---------------|-------------------|----------------|
| **Public Routes** | Customer-facing booking UI, slot selection, confirmation | Server Actions (read-only + booking mutations) | Phase 1 (MVP) |
| **Admin Routes** | Shop management, worker schedules, resource config, booking oversight | Server Actions (full CRUD) | Phase 2 |
| **Server Actions** | Handle mutations (bookings, cancellations), data fetching, form validation | Prisma Client, Domain Services | Phase 1 |
| **Domain Services** | Availability calculation, double-bottleneck logic, conflict detection | Prisma Client | Phase 1 (critical) |
| **Prisma Client** | Database queries, transactions, schema migrations | PostgreSQL | Phase 1 (foundation) |
| **Database** | Data persistence, constraints, integrity | Prisma Client only | Phase 1 (foundation) |

### Data Flow

#### Booking Creation Flow (Critical Path)

```
User selects slot → Public Route Component
                          ↓
            Server Action (createBooking)
                          ↓
    ┌─────────────────────────────────────┐
    │  Interactive Transaction Boundary   │
    │  (Serializable Isolation Level)     │
    ├─────────────────────────────────────┤
    │  1. Check Worker Availability       │
    │  2. Check Resource Capacity         │
    │  3. Calculate Conflicts             │
    │  4. Insert Booking Record           │
    │  5. Update Related Counters/Cache   │
    └─────────────────────────────────────┘
                          ↓
              Success/Failure Response
                          ↓
                Revalidate Path/Cache
                          ↓
              Return Updated UI State
```

#### Availability Query Flow

```
User requests date → Public Route Component
                          ↓
              Server Action (getAvailability)
                          ↓
            Domain Service (calculateSlots)
                          ↓
    ┌───────────────────────────────────────┐
    │  Efficient Query Strategy:            │
    │  1. Get all bookings for date range   │
    │  2. Get worker schedules              │
    │  3. Get resource capacity config      │
    │  4. Calculate available slots         │
    │     (workers free AND beds available) │
    └───────────────────────────────────────┘
                          ↓
              Return available time slots
                          ↓
                Display to user
```

## Core Data Model

### Essential Tables

Based on research of booking system patterns and SYNQ's specific requirements:

```typescript
// Shops (Multi-tenant ready)
model Shop {
  id              String    @id @default(cuid())
  name            String
  timezone        String    // Critical for date/time handling
  resourceCapacity Int      // Total beds/rooms
  // ... other shop config
  workers         Worker[]
  services        Service[]
  bookings        Booking[]
}

// Workers (Staff who provide services)
model Worker {
  id              String    @id @default(cuid())
  shopId          String
  shop            Shop      @relation(fields: [shopId], references: [id])
  name            String
  email           String?
  // ... contact info
  bookings        Booking[]
  schedules       WorkerSchedule[]
  serviceIds      String[]  // Which services can this worker provide
}

// Services offered
model Service {
  id              String    @id @default(cuid())
  shopId          String
  shop            Shop      @relation(fields: [shopId], references: [id])
  name            String
  durationMinutes Int       // How long does this service take
  price           Decimal
  description     String?
  bookings        Booking[]
}

// Bookings (Core transactional record)
model Booking {
  id              String    @id @default(cuid())
  shopId          String
  shop            Shop      @relation(fields: [shopId], references: [id])
  workerId        String
  worker          Worker    @relation(fields: [workerId], references: [id])
  serviceId       String
  service         Service   @relation(fields: [serviceId], references: [id])

  // Customer info
  customerName    String
  customerEmail   String
  customerPhone   String?

  // Time slot
  startTime       DateTime
  endTime         DateTime  // Calculated from startTime + service.durationMinutes

  // Status tracking
  status          BookingStatus @default(PENDING)

  // Concurrency control
  version         Int       @default(0)  // Optimistic locking

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([shopId, startTime, endTime]) // Critical for availability queries
  @@index([workerId, startTime, endTime]) // Worker availability
  @@index([status])
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
  NO_SHOW
}

// Worker schedules (when workers are available)
model WorkerSchedule {
  id              String    @id @default(cuid())
  workerId        String
  worker          Worker    @relation(fields: [workerId], references: [id])

  // Recurring schedule pattern
  dayOfWeek       Int       // 0=Sunday, 6=Saturday
  startTime       String    // "09:00" format
  endTime         String    // "17:00" format

  // Or one-off availability/unavailability
  specificDate    DateTime?
  isAvailable     Boolean   @default(true)

  @@index([workerId, dayOfWeek])
  @@index([workerId, specificDate])
}
```

### Key Schema Design Decisions

1. **Denormalized Time Fields**: Both `startTime` and `endTime` on Booking for faster range queries
2. **Composite Indexes**: Critical for "find all bookings in time range" queries
3. **Version Field**: Enables optimistic locking for concurrent booking prevention
4. **Status Enum**: Clear booking lifecycle management
5. **Timezone Storage**: On Shop model to handle date/time correctly across regions

## Patterns to Follow

### Pattern 1: Transaction-Wrapped Booking Creation

**What:** All booking mutations must execute within serializable transactions

**When:** Every create/update/cancel operation on bookings

**Why:** Prevents double-booking race conditions where two users book same slot simultaneously

**Example:**
```typescript
// server-action: create-booking.ts
'use server'

import { prisma } from '@/lib/prisma'

export async function createBooking(data: BookingInput) {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Check worker availability
        const workerConflicts = await tx.booking.findFirst({
          where: {
            workerId: data.workerId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            OR: [
              {
                startTime: { lte: data.startTime },
                endTime: { gt: data.startTime },
              },
              {
                startTime: { lt: data.endTime },
                endTime: { gte: data.endTime },
              },
            ],
          },
        })

        if (workerConflicts) {
          throw new Error('Worker not available')
        }

        // 2. Check resource capacity (beds)
        const concurrentBookingsCount = await tx.booking.count({
          where: {
            shopId: data.shopId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            OR: [
              {
                startTime: { lte: data.startTime },
                endTime: { gt: data.startTime },
              },
              {
                startTime: { lt: data.endTime },
                endTime: { gte: data.endTime },
              },
            ],
          },
        })

        const shop = await tx.shop.findUnique({
          where: { id: data.shopId },
          select: { resourceCapacity: true },
        })

        if (concurrentBookingsCount >= shop!.resourceCapacity) {
          throw new Error('No beds available')
        }

        // 3. Create booking
        const booking = await tx.booking.create({
          data: {
            ...data,
            status: 'CONFIRMED',
            version: 0,
          },
        })

        return booking
      },
      {
        isolationLevel: 'Serializable', // Critical!
        maxWait: 5000, // 5 seconds max wait
        timeout: 10000, // 10 seconds max transaction time
      }
    )

    revalidatePath('/bookings')
    return { success: true, booking: result }
  } catch (error) {
    if (error.code === 'P2034') {
      // Serialization failure - retry
      return { success: false, error: 'Slot no longer available' }
    }
    throw error
  }
}
```

**Source Confidence:** HIGH (Prisma official docs + WebSearch patterns)

### Pattern 2: Pre-Query Availability Calculation

**What:** Calculate available slots before presenting to user, not during booking

**When:** User navigates to booking calendar/picker

**Why:** Reduces failed bookings, better UX, separates read from write operations

**Example:**
```typescript
// domain/availability.ts

export async function calculateAvailableSlots(
  shopId: string,
  date: Date,
  serviceId: string
): Promise<TimeSlot[]> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { durationMinutes: true },
  })

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { resourceCapacity: true },
  })

  // Get all bookings for this date
  const startOfDay = startOfDate(date)
  const endOfDay = endOfDate(date)

  const bookings = await prisma.booking.findMany({
    where: {
      shopId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startTime: { gte: startOfDay },
      endTime: { lte: endOfDay },
    },
    select: {
      workerId: true,
      startTime: true,
      endTime: true,
    },
  })

  // Get workers who can perform this service
  const eligibleWorkers = await prisma.worker.findMany({
    where: {
      shopId,
      serviceIds: { has: serviceId },
    },
    include: {
      schedules: {
        where: {
          OR: [
            { dayOfWeek: date.getDay() },
            { specificDate: date },
          ],
          isAvailable: true,
        },
      },
    },
  })

  // Generate potential slots (e.g., 30-min intervals from 9am-5pm)
  const potentialSlots = generateTimeSlots(startOfDay, endOfDay, 30)

  // Filter slots where BOTH worker AND bed available
  const availableSlots = potentialSlots.filter((slot) => {
    // Check: At least one worker is free
    const hasAvailableWorker = eligibleWorkers.some((worker) => {
      const isInSchedule = worker.schedules.length > 0
      const hasNoConflict = !bookings.some(
        (b) =>
          b.workerId === worker.id &&
          slotsOverlap(slot, { start: b.startTime, end: b.endTime })
      )
      return isInSchedule && hasNoConflict
    })

    // Check: Bed capacity not exceeded
    const concurrentBookings = bookings.filter((b) =>
      slotsOverlap(slot, { start: b.startTime, end: b.endTime })
    )
    const hasCapacity = concurrentBookings.length < shop!.resourceCapacity

    return hasAvailableWorker && hasCapacity
  })

  return availableSlots
}
```

**Source Confidence:** MEDIUM (Derived from WebSearch patterns)

### Pattern 3: Route Segment Separation

**What:** Separate public and admin routes using Next.js 15 route groups

**When:** Application structure setup (Phase 1)

**Why:** Clear security boundaries, different layouts, easier middleware application

**Example:**
```
app/
├── (public)/              # Customer-facing
│   ├── layout.tsx         # Public layout (header, footer)
│   ├── page.tsx           # Landing page
│   ├── booking/
│   │   ├── [shopId]/
│   │   │   └── page.tsx   # Booking calendar
│   │   └── confirm/
│   │       └── page.tsx   # Confirmation page
│   └── api/               # Public API routes if needed
│
├── (admin)/               # Admin-only
│   ├── layout.tsx         # Admin layout (sidebar, nav)
│   ├── middleware.ts      # Auth enforcement
│   ├── dashboard/
│   │   └── page.tsx       # Overview
│   ├── bookings/
│   │   ├── page.tsx       # Booking list/calendar
│   │   └── [id]/
│   │       └── page.tsx   # Booking detail
│   ├── workers/
│   │   └── page.tsx       # Worker management
│   └── settings/
│       └── page.tsx       # Shop settings
│
└── actions/               # Server Actions (shared)
    ├── public/            # Public-safe actions
    │   ├── get-availability.ts
    │   └── create-booking.ts
    └── admin/             # Admin-only actions
        ├── manage-workers.ts
        └── update-shop-settings.ts
```

**Source Confidence:** HIGH (Next.js official patterns)

### Pattern 4: Optimistic Locking as Fallback

**What:** Use version field to detect concurrent modifications

**When:** As alternative to serializable transactions for lower-contention scenarios

**Why:** Better performance in some cases, retry is acceptable

**Example:**
```typescript
// Update booking status with optimistic locking
export async function updateBookingStatus(
  bookingId: string,
  currentVersion: number,
  newStatus: BookingStatus
) {
  const result = await prisma.booking.updateMany({
    where: {
      id: bookingId,
      version: currentVersion, // Only update if version matches
    },
    data: {
      status: newStatus,
      version: { increment: 1 },
    },
  })

  if (result.count === 0) {
    throw new Error('Booking was modified by another request')
  }

  return result
}
```

**Source Confidence:** HIGH (Prisma docs + WebSearch verification)

## Anti-Patterns to Avoid

### Anti-Pattern 1: Check-Then-Act Without Transaction

**What:** Querying availability, then creating booking in separate operations

**Why bad:** Race condition window - another booking can slip in between check and insert

**Consequences:** Double-bookings, angry customers, operational nightmare

**Instead:** Always wrap check + insert in serializable transaction (see Pattern 1)

**Source:** [Preventing Double Booking in Databases with Two-Phase Locking](https://medium.com/@oyebisijemil_41110/preventing-double-booking-in-databases-with-two-phase-locking-9a4538650496)

### Anti-Pattern 2: Client-Side Availability Calculation

**What:** Fetching all bookings to client, calculating availability in React component

**Why bad:**
- Exposes booking data unnecessarily
- Slow (network overhead)
- Not secure (calculations can be bypassed)
- Race conditions (data stale by time of booking)

**Instead:** Always calculate availability server-side, only return available slots

### Anti-Pattern 3: Missing Indexes on Time Range Queries

**What:** Querying bookings by date range without proper composite indexes

**Why bad:** Table scans become prohibitively slow as bookings grow (>1000 records)

**Consequences:** Availability queries take seconds, poor UX, timeout errors

**Detection:** Query times >100ms even with <1000 bookings

**Instead:** Add composite indexes on `(shopId, startTime, endTime)` and `(workerId, startTime, endTime)`

**Source:** [How to Design a Database for Booking and Reservation Systems](https://www.geeksforgeeks.org/dbms/how-to-design-a-database-for-booking-and-reservation-systems/)

### Anti-Pattern 4: Storing Only Start Time

**What:** Calculating end time on-the-fly by adding service duration

**Why bad:**
- Can't efficiently query "bookings overlapping with time range"
- Requires function-based index or denormalization anyway
- Complex queries are slower and error-prone

**Instead:** Denormalize: store both `startTime` and `endTime`, update both during booking creation

### Anti-Pattern 5: Mixing Admin and Public Queries in Same Components

**What:** Same React Server Component used for both public and admin views

**Why bad:**
- Security risks (accidental data exposure)
- Different data access patterns (admin needs more)
- Harder to optimize caching strategies
- Confusing code paths

**Instead:** Use route groups to physically separate concerns (see Pattern 3)

## Query Optimization Strategies

### Critical Queries to Optimize

| Query Type | Frequency | Optimization |
|------------|-----------|--------------|
| **Get available slots for date** | Very High (every page load) | Composite indexes + query result caching (5min TTL) |
| **Check worker availability** | High (during booking) | Index on `(workerId, startTime, endTime)` + transaction |
| **Check resource capacity** | High (during booking) | Count query + index on `(shopId, status, startTime)` |
| **List bookings for day (admin)** | Medium | Index on `(shopId, startTime)` + pagination |
| **Get booking detail** | Low | Primary key lookup (fast) |

### Caching Strategy

**Availability Queries:**
- Cache for 5 minutes (acceptable staleness)
- Invalidate on booking creation/cancellation
- Use Next.js `unstable_cache` or React Cache

**Static Data:**
- Workers, Services, Shop settings
- Cache for 1 hour
- Invalidate on admin updates

**No Caching:**
- Booking mutations (always fresh)
- Admin booking list (real-time important)

## Scalability Considerations

| Concern | At 100 bookings/day | At 1,000 bookings/day | At 10,000 bookings/day |
|---------|---------------------|----------------------|------------------------|
| **Database reads** | Simple queries with indexes work fine | Add query result caching (5min TTL) | Read replicas for availability queries, write to primary for bookings |
| **Concurrent bookings** | Serializable transactions sufficient | Same + add retry logic with exponential backoff | Consider optimistic locking for lower-contention time slots, keep serializable for hot slots |
| **Availability calculation** | Calculate on-demand | Cache results per date/service combo | Pre-calculate for next 7 days, update async on booking changes |
| **Data size** | Single table fine | Single table fine | Partition bookings by date (yearly or quarterly) |
| **Admin queries** | No optimization needed | Add pagination (50 records/page) | Add date range filters, separate analytics queries to replica |

### When to Introduce Complexity

**Now (Phase 1):**
- Proper indexes
- Serializable transactions
- Basic caching (Next.js built-in)

**Later (If >1000 bookings/day):**
- Query result caching with Redis
- Background job for pre-calculating availability
- Read replicas

**Much Later (If >10,000 bookings/day):**
- Event sourcing pattern
- Separate booking service with dedicated DB
- CQRS (Command Query Responsibility Segregation)

## Build Order Recommendations

Based on component dependencies:

### Phase 1: Foundation (MVP)
1. **Database schema** - Define all models, migrations
2. **Domain services** - Availability calculation, booking logic
3. **Public routes skeleton** - Basic layout, navigation
4. **Server actions** - createBooking, getAvailability (with transactions)
5. **Public booking UI** - Calendar, slot selection, confirmation

**Critical Path:** Database → Domain Services → Server Actions → UI

**Why This Order:** Can't build UI without actions, can't build actions without domain logic, can't build domain logic without schema

### Phase 2: Admin Tools
1. **Admin routes skeleton** - Layout, auth middleware
2. **Admin server actions** - CRUD for workers, services, settings
3. **Admin booking management** - View, cancel, reschedule
4. **Worker schedule management**
5. **Shop settings**

**Dependencies:** Requires Phase 1 schema, but can build in parallel with Phase 1 UI

### Phase 3: Enhancements
1. **Notifications** - Email confirmations, reminders
2. **Analytics** - Booking trends, worker utilization
3. **Advanced features** - Recurring bookings, waiting list
4. **Performance optimization** - Caching, query optimization

**Dependencies:** Requires solid Phase 1 and Phase 2 foundation

## Technology-Specific Notes

### Next.js 15 Server Actions

**Best Practices:**
- Use `'use server'` directive for server-only logic
- Always revalidate paths after mutations: `revalidatePath('/bookings')`
- Return serializable data only (no functions, no Date objects that aren't serialized)
- Handle errors with try/catch, return error states to client

**Source:** [Modern Full Stack Application Architecture Using Next.js 15+](https://softwaremill.com/modern-full-stack-application-architecture-using-next-js-15/)

### Prisma with PostgreSQL

**Transaction Gotchas:**
- Serializable isolation can throw P2034 errors - implement retry logic
- Interactive transactions hold DB connections - keep them short (<5 seconds)
- Batch operations are NOT transactional unless wrapped in `$transaction`

**Source:** [Transactions and batch queries (Reference) | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)

### Supabase Considerations

**Integration Points:**
- Supabase Auth for admin authentication (if using)
- Direct PostgreSQL connection via Prisma (bypass Supabase client for booking logic)
- Row Level Security (RLS) policies for additional protection (optional, Prisma handles most access control)

**Why Direct Connection:** Booking transactions need fine-grained control that Supabase client doesn't expose

## Security Boundaries

| Layer | Public Access | Admin Access | Implementation |
|-------|--------------|--------------|----------------|
| **Routes** | `/booking/*` | `/admin/*` | Next.js route groups + middleware |
| **Server Actions** | Read availability, create own booking | Full CRUD on all resources | Function-level auth checks |
| **Database** | Via server actions only | Via server actions only | No direct client access |
| **Business Logic** | Limited to booking creation | Full system management | Service layer authorization |

**Key Principle:** Never trust client. Always validate permissions server-side, even in server actions.

## Sources

**HIGH Confidence:**
- [Transactions and batch queries (Reference) | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Modern Full Stack Application Architecture Using Next.js 15+](https://softwaremill.com/modern-full-stack-application-architecture-using-next-js-15/)
- [Building a Real-Time Booking System with Next.js 14: A Practical Guide](https://medium.com/@abdulrehmanikram9710/building-a-real-time-booking-system-with-next-js-14-a-practical-guide-d67d7f944d76)

**MEDIUM Confidence:**
- [How to Design a Database for Booking and Reservation Systems - GeeksforGeeks](https://www.geeksforgeeks.org/dbms/how-to-design-a-database-for-booking-and-reservation-systems/)
- [Preventing Double Booking in Databases with Two-Phase Locking](https://medium.com/@oyebisijemil_41110/preventing-double-booking-in-databases-with-two-phase-locking-9a4538650496)
- [Solving Double Booking at Scale: System Design Patterns from Top Tech Companies](https://itnext.io/solving-double-booking-at-scale-system-design-patterns-from-top-tech-companies-4c5a3311d8ea)
- [A Database Model for a Hotel Reservation Booking App and Channel Manager | Redgate](https://www.red-gate.com/blog/a-database-model-for-a-hotel-reservation-booking-app-and-channel-manager)
- [A Database Model to Manage Appointments and Organize Schedules | Vertabelo](https://vertabelo.com/blog/a-database-model-to-manage-appointments-and-organize-schedules/)

**LOW Confidence (Community Patterns):**
- [Row update with DB Row Lock (SELECT FOR UPDATE) · Issue #1918 · prisma/prisma](https://github.com/prisma/prisma/issues/1918)
- [Table design for booking/appointment system - SitePoint Forums](https://www.sitepoint.com/community/t/table-design-for-booking-appointment-system/332123)
