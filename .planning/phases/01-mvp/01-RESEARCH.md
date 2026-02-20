# Phase 1: MVP - Research

**Researched:** 2026-02-04
**Domain:** Full-stack booking system (Next.js 15 App Router + Supabase + Prisma)
**Confidence:** MEDIUM

## Summary

Phase 1 requires building a production-ready booking system with Next.js 15 App Router, Supabase (PostgreSQL), and Prisma ORM. The core challenge is implementing double-bottleneck availability logic (worker + resource) while preventing race conditions through serializable transactions and row-level security.

Research reveals that Next.js 15 introduces significant breaking changes (async params, uncached GET handlers by default) and that the Prisma + Supabase + RLS combination requires careful configuration to avoid common pitfalls like connection pooling issues and shadow database permissions. The double-bottleneck booking logic is best implemented using PostgreSQL's SELECT FOR UPDATE with serializable transaction isolation.

Key findings show that the modern Next.js App Router ecosystem has stabilized around: Server Actions with Zod validation, SWR polling for real-time updates, Resend + React Email for transactional emails, and feature-based service layer patterns over traditional layered architecture.

**Primary recommendation:** Use serializable transactions with SELECT FOR UPDATE for booking creation, implement RLS with a dedicated Prisma role (not master key), separate business logic into a service layer testable independently of UI, and adopt Server Actions with shared Zod schemas for type-safe validation on both client and server.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x (NOT 16.x) | App Router framework | Industry standard for React SSR; avoid v16 due to CVE-2025-66478 |
| TypeScript | 5.x with strict mode | Type safety | Next.js 15 enhanced type safety with App Router; strict mode catches nullability issues |
| Supabase | Latest | Hosted PostgreSQL with RLS | Native RLS support, REST API, integrated auth system |
| Prisma | 5.x+ | ORM with transaction support | Type-safe queries, serializable transaction isolation, schema migrations |
| Tailwind CSS | 4.x | Utility-first styling | Rapid development, custom components via design tokens |
| next-intl | 3.x | Route-based i18n | Official Next.js i18n pattern, middleware integration |
| SWR | 2.x | Data fetching with polling | Created by Vercel/Next.js team, stale-while-revalidate pattern |
| Resend | Latest | Email API | React Email integration, developer-friendly, transactional focus |
| Zod | 3.x | Schema validation | Shared validation between client/server, type inference |
| Jest | 29.x | Testing framework | Official Next.js testing docs support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Email | 3.x | Email template components | Building transactional email templates with React |
| @testing-library/react | 14.x+ | Component testing | Testing React components in Jest |
| @upstash/ratelimit | Latest | Rate limiting | Edge-compatible rate limiting for API routes |
| prisma-extension-supabase-rls | Latest | RLS with Prisma | If not using direct SQL for RLS policies |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Jest | Vitest | Vitest has better Next.js 15 + React 19 compatibility; Jest has mature ecosystem but compatibility issues reported |
| Resend | SendGrid, Mailgun | Resend optimized for React Email; others more feature-rich but heavier integration |
| Custom UI | Shadcn/ui | Custom components = leaner bundle + full control; Shadcn = faster setup but larger bundle |
| SWR | TanStack Query | SWR simpler for polling; TanStack Query more powerful for complex state |

**Installation:**
```bash
# Core dependencies
npm install next@15 react react-dom typescript
npm install @supabase/supabase-js prisma @prisma/client
npm install tailwindcss postcss autoprefixer
npm install next-intl swr zod resend react-email

# Development dependencies
npm install -D @types/node @types/react @types/react-dom
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom
npm install -D prisma

# Rate limiting
npm install @upstash/ratelimit @upstash/redis
```

## Architecture Patterns

### Recommended Project Structure
```
synq/
├── app/                          # Next.js 15 App Router
│   ├── [locale]/                # next-intl route-based locales
│   │   ├── (public)/           # Public routes (auth, landing)
│   │   ├── (user)/             # User-facing booking flow
│   │   ├── (admin)/            # Admin management pages
│   │   └── layout.tsx
│   ├── api/                     # API routes (webhooks, non-action endpoints)
│   └── actions/                # Server Actions (centralized)
├── src/
│   ├── components/             # React components
│   │   ├── ui/                # Base UI components (Button, Input, etc.)
│   │   ├── calendar/          # Calendar-specific components
│   │   └── forms/             # Form components
│   ├── lib/                    # Business logic & utilities
│   │   ├── services/          # Service layer (booking, availability, etc.)
│   │   ├── db/                # Prisma client, connection utilities
│   │   ├── email/             # Email templates & sending logic
│   │   ├── validations/       # Zod schemas (shared client/server)
│   │   └── utils/             # Pure utility functions
│   ├── types/                  # TypeScript types/interfaces
│   └── hooks/                  # React hooks (SWR wrappers, etc.)
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Prisma migrations
│   └── seed.ts                # Database seeding
├── emails/                     # React Email templates
├── __tests__/                  # Jest tests
│   ├── unit/                  # Unit tests (services, utils)
│   └── integration/           # Integration tests (API, DB)
└── public/                     # Static assets
```

### Pattern 1: Service Layer Separation
**What:** Separate business logic from UI components and Server Actions into service functions.

**When to use:** Always for complex business logic (booking availability, transaction handling).

**Why:** Testable independently of Next.js runtime, reusable across Server Actions and API routes, maintains single responsibility.

**Example:**
```typescript
// src/lib/services/booking.service.ts
import { prisma } from '@/lib/db/client'
import { Prisma } from '@prisma/client'

export async function createBooking(input: {
  userId: string
  serviceId: string
  workerId: string
  resourceId: string
  startTime: Date
  endTime: Date
}) {
  // Use serializable transaction to prevent race conditions
  return await prisma.$transaction(
    async (tx) => {
      // Lock availability records
      const workerAvailable = await tx.worker.findFirst({
        where: {
          id: input.workerId,
          // Check availability logic
        },
        select: { id: true },
        // FOR UPDATE lock
      })

      const resourceAvailable = await tx.resource.findFirst({
        where: {
          id: input.resourceId,
          // Check availability logic
        },
        select: { id: true },
      })

      if (!workerAvailable || !resourceAvailable) {
        throw new Error('Slot unavailable')
      }

      // Create booking
      return tx.booking.create({
        data: {
          userId: input.userId,
          serviceId: input.serviceId,
          workerId: input.workerId,
          resourceId: input.resourceId,
          startTime: input.startTime,
          endTime: input.endTime,
          status: 'CONFIRMED',
        },
      })
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 10000, // 10s timeout
    }
  )
}

// app/actions/booking.actions.ts
'use server'
import { createBooking } from '@/lib/services/booking.service'
import { bookingSchema } from '@/lib/validations/booking'

export async function createBookingAction(formData: FormData) {
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  try {
    const booking = await createBooking(parsed.data)
    return { success: true, booking }
  } catch (error) {
    return { error: 'Failed to create booking' }
  }
}
```

### Pattern 2: Shared Zod Validation Schemas
**What:** Define Zod schemas once, use on both client (React Hook Form) and server (Server Actions).

**When to use:** All forms with server-side validation.

**Why:** Single source of truth, type inference, no duplication, progressive enhancement.

**Example:**
```typescript
// src/lib/validations/booking.ts
import { z } from 'zod'

export const bookingSchema = z.object({
  serviceId: z.string().uuid(),
  workerId: z.string().uuid(),
  resourceId: z.string().uuid(),
  date: z.string().datetime(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
}).refine((data) => data.endTime > data.startTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
})

export type BookingInput = z.infer<typeof bookingSchema>

// Client usage (React Hook Form)
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const form = useForm<BookingInput>({
  resolver: zodResolver(bookingSchema),
})

// Server usage (Server Action)
'use server'
export async function createBookingAction(input: unknown) {
  const parsed = bookingSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }
  // ... proceed with parsed.data
}
```

### Pattern 3: SWR Polling for Real-Time Calendar Updates
**What:** Use SWR's `refreshInterval` to poll for availability changes without WebSockets.

**When to use:** Calendar views, availability display, live booking updates.

**Why:** Simpler than WebSockets, automatic revalidation on focus, built-in error retry, works with Next.js App Router client components.

**Example:**
```typescript
// src/hooks/useAvailability.ts
'use client'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useAvailability(date: string, serviceId: string) {
  return useSWR(
    `/api/availability?date=${date}&serviceId=${serviceId}`,
    fetcher,
    {
      refreshInterval: 10000, // Poll every 10 seconds
      revalidateOnFocus: true, // Refresh when tab gains focus
      revalidateOnReconnect: true, // Refresh on network reconnect
      dedupingInterval: 2000, // Dedupe requests within 2s
    }
  )
}

// Usage in component
const { data, error, isLoading } = useAvailability('2026-02-05', serviceId)
```

### Pattern 4: RLS Policies with Prisma
**What:** Use Supabase RLS policies with Prisma through dedicated database role and JWT claims.

**When to use:** All database tables (SECR-06 requirement).

**Why:** Defense in depth, protects against API bugs, enforces authorization at database level.

**Example:**
```sql
-- Enable RLS on all tables
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings"
ON bookings FOR SELECT
USING (auth.uid() = user_id);

-- Users can create bookings for themselves
CREATE POLICY "Users can create own bookings"
ON bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
ON bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
);

-- Workers and resources are public read
CREATE POLICY "Public can view workers"
ON workers FOR SELECT
USING (true);
```

**Prisma Connection Setup:**
```typescript
// src/lib/db/client.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// For RLS: Use Supabase connection string with pgbouncer=true
// DATABASE_URL="postgresql://postgres:password@db.project.supabase.co:5432/postgres?pgbouncer=true"
```

### Pattern 5: Resend + React Email for Transactional Emails
**What:** Build email templates as React components, send via Resend API.

**When to use:** All transactional emails (booking confirmations, cancellations, reminders).

**Why:** Component-based templates, preview in development, TypeScript support, no table-based HTML.

**Example:**
```typescript
// emails/booking-confirmation.tsx
import { Html, Head, Body, Container, Text, Button } from '@react-email/components'

interface BookingConfirmationProps {
  userName: string
  serviceName: string
  startTime: string
  workerName: string
}

export default function BookingConfirmation({
  userName,
  serviceName,
  startTime,
  workerName,
}: BookingConfirmationProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif' }}>
        <Container>
          <Text>Hi {userName},</Text>
          <Text>Your booking for {serviceName} has been confirmed!</Text>
          <Text>
            <strong>Service:</strong> {serviceName}<br />
            <strong>Time:</strong> {startTime}<br />
            <strong>Worker:</strong> {workerName}
          </Text>
          <Button href="https://yourapp.com/bookings">View Booking</Button>
        </Container>
      </Body>
    </Html>
  )
}

// src/lib/email/send.ts
import { Resend } from 'resend'
import BookingConfirmation from '@/emails/booking-confirmation'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendBookingConfirmation(to: string, props: BookingConfirmationProps) {
  return resend.emails.send({
    from: 'bookings@yourdomain.com',
    to,
    subject: 'Booking Confirmed',
    react: BookingConfirmation(props),
  })
}
```

### Anti-Patterns to Avoid

- **Using global Prisma transactions without isolation level:** Leads to race conditions in concurrent bookings. Always specify `isolationLevel: Serializable` for booking creation.

- **Caching GET handlers without cache headers:** Next.js 15 defaults to uncached; if you want caching, explicitly set `export const dynamic = 'force-static'` or use cache headers.

- **Using master/service_role key for Prisma in production:** Bypasses RLS. Create dedicated database role with RLS enforcement.

- **Mixing Server and Client Component logic without "use client"/"use server":** Next.js 15 requires explicit directives. Always mark client components with `'use client'` and server actions with `'use server'`.

- **Not handling async params in Next.js 15:** `params` and `searchParams` are now async. Must await them: `const { locale } = await params`.

- **Creating too many Prisma client instances:** Exhausts connection pool. Use singleton pattern (global variable in development).

- **Ignoring Jest + React 19 compatibility issues:** Jest has known issues with Next.js 15 + React 19. Consider Vitest if encountering test failures after upgrade.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email templates | HTML table layouts | React Email + Resend | Cross-client compatibility is hard; React Email handles dark mode, responsive design, preview |
| Rate limiting | Custom in-memory counters | @upstash/ratelimit with Redis | Edge-compatible, distributed, handles multi-region, sliding window |
| Form validation | Manual field checks | Zod schemas | Type inference, composable, error formatting, shared client/server |
| Date/time localization | Manual formatting | next-intl's date/time formatters | Handles timezones, locales, DST correctly |
| Database transactions | Manual BEGIN/COMMIT | Prisma transactions with isolation level | Handles retries on serialization failures, connection management |
| i18n routing | Custom middleware | next-intl with defineRouting | Handles locale detection, SEO, alternate links, cookie persistence |
| Connection pooling | Direct PostgreSQL connections | Supavisor (Supabase) with pgbouncer=true | Transaction mode pooling, prevents connection exhaustion in serverless |

**Key insight:** Booking systems have subtle edge cases (timezone handling, concurrent bookings, email deliverability, connection pooling in serverless). Use battle-tested libraries that handle these edge cases rather than discovering them in production.

## Common Pitfalls

### Pitfall 1: Race Conditions in Booking Creation
**What goes wrong:** Multiple users book the same time slot simultaneously; both bookings succeed, causing double-booking.

**Why it happens:** Default transaction isolation (READ COMMITTED) allows concurrent reads of available slots before writes.

**How to avoid:**
- Use serializable transaction isolation: `isolationLevel: Prisma.TransactionIsolationLevel.Serializable`
- Implement SELECT FOR UPDATE for locking availability records
- Handle serialization failures with retry logic (Prisma throws P2034 error)

**Warning signs:**
- Multiple bookings for same worker/resource at same time in production
- Intermittent "slot unavailable" errors that resolve on retry
- Database deadlock errors in logs

**Sources:**
- [Prisma Transactions Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Preventing Race Conditions with SERIALIZABLE Isolation in Supabase (GitHub Discussion #30334)](https://github.com/orgs/supabase/discussions/30334)
- [How to Solve Race Conditions in a Booking System (HackerNoon)](https://hackernoon.com/how-to-solve-race-conditions-in-a-booking-system)

### Pitfall 2: Prisma Connection Pool Exhaustion in Serverless
**What goes wrong:** "Too many connections" errors in production, especially under load or with multiple function instances.

**Why it happens:** Each Prisma Client instance creates `num_cpus * 2 + 1` connections by default. Serverless environments create many instances.

**How to avoid:**
- Use Supavisor in transaction mode (connection pooling): Add `pgbouncer=true` to connection string
- Disable prepared statements in Supabase transaction mode (Supavisor doesn't support them)
- Use singleton Prisma Client pattern (global variable in development for hot reload)
- Reduce connection_limit if needed: `pool_timeout = 10`

**Warning signs:**
- "Too many connections" errors
- Slow database queries despite low CPU
- Connection timeouts during traffic spikes

**Sources:**
- [Troubleshooting Prisma Errors (Supabase Docs)](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting)
- [Prisma with Supabase: Best Practices (Prosperasoft)](https://prosperasoft.com/blog/database/supabase/supabase-prisma-guide/)

### Pitfall 3: Next.js 15 Async Params Breaking Changes
**What goes wrong:** Type errors like "Promise<any> expected" during build, runtime errors accessing params.locale directly.

**Why it happens:** Next.js 15 made `params` and `searchParams` async for future optimization. Old code treats them as plain objects.

**How to avoid:**
- Always await params: `const { locale } = await params`
- Update all page/layout components to handle async params
- Update next-intl configuration for async params pattern
- Run `next build` to catch all async param issues

**Warning signs:**
- TypeScript errors about Promise types
- Runtime "Cannot read property 'locale' of undefined" errors
- Build failures with param-related type mismatches

**Sources:**
- [Next.js 15 Upgrade Guide (Prateeksha)](https://prateeksha.com/blog/nextjs-15-upgrade-guide-app-router-caching-migration)
- [Next.js 15 params Type Error Discussion (GitHub #80494)](https://github.com/vercel/next.js/discussions/80494)

### Pitfall 4: RLS Bypassed by Service Role Key
**What goes wrong:** Production uses master/service_role key with Prisma, bypassing all RLS policies. Security vulnerability.

**Why it happens:** Default Supabase examples use service_role key for simplicity. Developers copy to production without understanding RLS enforcement.

**How to avoid:**
- Create dedicated database role for Prisma with RLS enforcement
- Grant only necessary permissions to Prisma role (no SUPERUSER)
- Add `createdb` modifier for shadow database (migrations only)
- Use anon key + JWT for client-side queries
- Test RLS policies work by attempting unauthorized access

**Warning signs:**
- All database queries succeed regardless of user context
- RLS policies defined but never enforced
- Able to access other users' data via API

**Sources:**
- [Making Prisma and Supabase Play Nicely (Medium)](https://medium.com/@warren_74490/making-prisma-and-supabase-play-nicely-5acfe2255591)
- [Prisma with Supabase RLS Policies (Medium)](https://medium.com/@kavitanambissan/prisma-with-supabase-rls-policies-c72b68a62330)

### Pitfall 5: Jest + Next.js 15 + React 19 Compatibility Issues
**What goes wrong:** Tests fail after upgrading to Next.js 15, mysterious React hook errors, module resolution problems.

**Why it happens:** Jest's module resolution struggles with React 19's new internal architecture. React Server Components add complexity.

**How to avoid:**
- Use Next.js's built-in Jest configuration: `next/jest`
- Set test environment to jsdom: `testEnvironment: 'jsdom'`
- Mock `next/navigation` for router-dependent components
- Consider Vitest as alternative (better Next.js 15 compatibility)
- Keep `@testing-library/react` updated (14.x+)

**Warning signs:**
- "Cannot find module" errors in tests
- "Invalid hook call" errors
- Tests pass locally but fail in CI
- RSC-specific test failures

**Sources:**
- [Mastering Jest in Next.js App Router (DEV Community)](https://dev.to/alaa-samy/mastering-jest-in-nextjs-a-complete-guide-for-app-router-and-typescript-o28)
- [How to Setup Jest in Next 15 Project (DEV Community)](https://dev.to/peterlidee/3-how-to-setup-jest-in-a-next-15-project-eslint-for-testing-aab)

### Pitfall 6: Uncached GET Handlers Leading to Performance Issues
**What goes wrong:** API routes hit database on every request, causing slow response times and high database load.

**Why it happens:** Next.js 15 changed default caching behavior. GET Route Handlers are uncached by default (unlike Next.js 14).

**How to avoid:**
- Explicitly opt into caching if needed: `export const dynamic = 'force-static'`
- Use `revalidate` for time-based cache invalidation
- Add Cache-Control headers manually if needed
- Use SWR for client-side caching instead of relying on server cache
- Add automated tests checking for Cache-Control headers

**Warning signs:**
- Slow API response times in production vs. development
- High database query count for read-only data
- Increased hosting costs due to database load

**Sources:**
- [Next.js 15 Release Blog](https://nextjs.org/blog/next-15)
- [Next.js App Router: Common Mistakes (Upsun)](https://upsun.com/blog/avoid-common-mistakes-with-next-js-app-router/)

## Code Examples

Verified patterns from official sources and community best practices:

### Double-Bottleneck Availability Check (Worker + Resource)
```typescript
// src/lib/services/availability.service.ts
import { prisma } from '@/lib/db/client'

export async function checkAvailability(input: {
  serviceId: string
  workerId?: string
  resourceId?: string
  startTime: Date
  endTime: Date
}) {
  // Check service requires both worker and resource (double bottleneck)
  const service = await prisma.service.findUnique({
    where: { id: input.serviceId },
    select: { requiresWorker: true, requiresResource: true },
  })

  if (!service) throw new Error('Service not found')

  // Check worker availability
  let workerAvailable = true
  if (service.requiresWorker && input.workerId) {
    const conflicts = await prisma.booking.count({
      where: {
        workerId: input.workerId,
        status: { in: ['CONFIRMED', 'PENDING'] },
        OR: [
          // New booking starts during existing booking
          {
            startTime: { lte: input.startTime },
            endTime: { gt: input.startTime },
          },
          // New booking ends during existing booking
          {
            startTime: { lt: input.endTime },
            endTime: { gte: input.endTime },
          },
          // New booking contains existing booking
          {
            startTime: { gte: input.startTime },
            endTime: { lte: input.endTime },
          },
        ],
      },
    })
    workerAvailable = conflicts === 0
  }

  // Check resource availability
  let resourceAvailable = true
  if (service.requiresResource && input.resourceId) {
    const conflicts = await prisma.booking.count({
      where: {
        resourceId: input.resourceId,
        status: { in: ['CONFIRMED', 'PENDING'] },
        OR: [
          {
            startTime: { lte: input.startTime },
            endTime: { gt: input.startTime },
          },
          {
            startTime: { lt: input.endTime },
            endTime: { gte: input.endTime },
          },
          {
            startTime: { gte: input.startTime },
            endTime: { lte: input.endTime },
          },
        ],
      },
    })
    resourceAvailable = conflicts === 0
  }

  return {
    available: workerAvailable && resourceAvailable,
    workerAvailable,
    resourceAvailable,
  }
}
```

### Rate Limiting Middleware
```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
  analytics: true,
})

export async function middleware(request: NextRequest) {
  // Rate limit API routes only
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.ip ?? '127.0.0.1'
    const { success, limit, reset, remaining } = await ratelimit.limit(ip)

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
```

### Jest Configuration for Next.js 15
```typescript
// jest.config.ts
import type { Config } from 'jest'
import nextJest from 'next/jest'

const createJestConfig = nextJest({
  dir: './',
})

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
}

export default createJestConfig(config)

// jest.setup.ts
import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))
```

### next-intl Setup with Next.js 15
```typescript
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'es', 'fr'],
  defaultLocale: 'en',
})

// src/middleware.ts
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}

// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})

// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const { locale } = await params // Next.js 15: params are async

  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js 14 cached GET by default | Next.js 15 uncached by default | Oct 2024 (v15.0) | Must explicitly opt into caching; prevents stale data bugs |
| Synchronous params/searchParams | Async params/searchParams | Oct 2024 (v15.0) | Breaking change; must await in all pages/layouts |
| Shadcn/ui ubiquitous | Custom components preferred | Ongoing | Custom = leaner bundles, but slower initial dev |
| Jest standard | Vitest gaining traction | 2025+ | Vitest has better Next.js 15 + React 19 compatibility |
| useFormState | useActionState | React 19 (2024) | Renamed hook; same functionality |
| Manual i18n routing | next-intl with defineRouting | next-intl v3+ | Cleaner setup, better DX, official pattern |
| WebSockets for real-time | SWR polling | Ongoing | Simpler for read-heavy scenarios like calendars |

**Deprecated/outdated:**
- **Using service_role key in production:** Bypasses RLS. Use dedicated database role.
- **getServerSideProps/getStaticProps:** Replaced by Server Components and async data fetching in App Router.
- **Pages Router for new projects:** App Router is stable and recommended for Next.js 15.
- **@next/font:** Deprecated in favor of next/font.

## Open Questions

Things that couldn't be fully resolved:

1. **Jest vs Vitest for Next.js 15**
   - What we know: Jest has compatibility issues with Next.js 15 + React 19; Vitest reportedly works better
   - What's unclear: Whether Jest issues will be resolved soon, or if Vitest is the recommended path forward
   - Recommendation: Start with Jest (official Next.js docs support), but be prepared to switch to Vitest if tests become unreliable. Budget time for test debugging.

2. **Optimal polling interval for SWR**
   - What we know: 10 seconds is common; too frequent = high server load, too slow = stale data
   - What's unclear: Best interval for booking calendar given expected traffic and booking frequency
   - Recommendation: Start with 10s polling, add conditional polling (faster when calendar is focused, slower when idle). Monitor server load in production and adjust.

3. **Prisma RLS extension maturity**
   - What we know: `prisma-extension-supabase-rls` exists but is community-maintained, still in preview
   - What's unclear: Production readiness, performance overhead, transaction compatibility
   - Recommendation: Prefer direct SQL RLS policies over Prisma extension for MVP. Extension is convenient for prototyping but may have edge cases. Revisit after MVP launch.

4. **Handling serialization failures in booking transactions**
   - What we know: Serializable transactions can fail with P2034 error when conflicts detected
   - What's unclear: Best retry strategy (exponential backoff? immediate retry? how many attempts?)
   - Recommendation: Implement 3 retries with exponential backoff (100ms, 200ms, 400ms). Log failures for monitoring. Consider falling back to pessimistic locking (SELECT FOR UPDATE) if serialization failures are frequent.

## Sources

### Primary (HIGH confidence)
- [Next.js 15 Release Blog](https://nextjs.org/blog/next-15) - Breaking changes, caching behavior
- [Prisma Transactions Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) - Isolation levels, transaction API
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) - RLS patterns, policy examples
- [next-intl Documentation](https://next-intl.dev/docs/getting-started/app-router) - Setup with App Router
- [SWR Documentation](https://swr.vercel.app/) - Polling, revalidation patterns
- [Resend with Next.js](https://resend.com/docs/send-with-nextjs) - Integration guide
- [React Email Documentation](https://react.email) - Component API, templates

### Secondary (MEDIUM confidence)
- [Next.js 15 Advanced Patterns for 2026](https://johal.in/next-js-15-advanced-patterns-app-router-server-actions-and-caching-strategies-for-2026/) - Architecture patterns
- [Building Production-Ready Next.js App Router Architecture (DEV Community)](https://dev.to/yukionishi1129/building-a-production-ready-nextjs-app-router-architecture-a-complete-playbook-3f3h) - Service layer patterns
- [Solving Double Booking at Scale (ITNEXT)](https://itnext.io/solving-double-booking-at-scale-system-design-patterns-from-top-tech-companies-4c5a3311d8ea) - Booking system patterns
- [How to Solve Race Conditions in a Booking System (HackerNoon)](https://hackernoon.com/how-to-solve-race-conditions-in-a-booking-system) - Race condition prevention
- [Preventing Double Booking with PostgreSQL](https://jsupskills.dev/how-to-solve-the-double-booking-problem/) - SELECT FOR UPDATE patterns
- [Tailwind CSS Best Practices 2025-2026 (FrontendTools)](https://www.frontendtools.tech/blog/tailwind-css-best-practices-design-system-patterns) - Design system patterns

### Tertiary (LOW confidence - WebSearch only)
- Various Medium articles on Prisma + Supabase integration - implementation details vary
- GitHub discussions on Jest + Next.js 15 issues - ongoing evolving situation
- DEV Community posts on server actions + Zod - community patterns, not official

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official documentation confirms Next.js 15, Prisma, Supabase, Resend, next-intl patterns
- Architecture: MEDIUM - Service layer pattern widely recommended but not officially mandated; project structure varies by team
- Pitfalls: MEDIUM - Race conditions and connection pooling well-documented; Jest compatibility issues confirmed but evolving

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days - stable ecosystem, but Next.js/React tooling evolves quickly)

**Notes:**
- Next.js 16 should be avoided due to CVE-2025-66478 (security requirement)
- React 19 + Jest compatibility issues are a known concern; may need Vitest fallback
- Prisma serializable transactions are the recommended approach for booking race condition prevention
- Custom UI components preferred over Shadcn/ui per STATE.md decision (leaner bundle)
- All findings assume TypeScript strict mode (required per STATE.md)
