# Technology Stack - SYNQ

**Project:** SYNQ - Wellness Booking System for Japan
**Domain:** Appointment/reservation system (seitai, massage, yoga, pilates)
**Researched:** 2026-02-04
**Overall confidence:** HIGH

## Executive Summary

This research focuses on best practices and library recommendations for the pre-decided tech stack (Next.js 15, TypeScript, Supabase, Prisma, Tailwind). The 2025 landscape strongly validates these core choices while revealing critical patterns for booking systems: transaction-based concurrency control, Row-Level Security for multi-tenant isolation, and careful calendar component selection.

**Key insight:** Booking systems require special attention to race conditions (double-booking prevention) and multi-tenant data isolation. The Prisma + Supabase combination handles these well but requires specific patterns documented below.

---

## Core Framework

### Next.js 15.5 (App Router)
| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| Next.js | 15.5.x | Full-stack framework | App Router is production-ready, server-first by default. **Note:** Next.js 16 was released Oct 2025, but 15.5 remains stable LTS. Stick with 15.5 for now unless Turbopack improvements are critical. |
| React | 19.x | UI library | Required by Next.js 15, stable as of Oct 2024 |
| TypeScript | 5.x | Type system | Essential for booking domain complexity |

**Confidence:** HIGH (verified via [Next.js official docs](https://nextjs.org/docs/app), [Next.js 15.5 release](https://nextjs.org/blog/next-15-5))

**Configuration:**
```json
// tsconfig.json - Recommended strict settings
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

```js
// next.config.js
module.exports = {
  reactStrictMode: true, // true by default in App Router since 13.5.1
  typescript: {
    ignoreBuildErrors: false // Enforce type safety
  }
}
```

**Best practices for App Router:**
- Server Components by default (ship minimal client JS)
- Use `'use client'` sparingly - only when needed for interactivity
- Leverage streaming with `loading.tsx` for booking confirmations
- Tag-based cache invalidation: `{ next: { tags: ['bookings'] } }` + `revalidateTag('bookings')`
- Avoid `cache: 'no-store'` unless absolutely required

**Sources:**
- [Next.js App Router Guides](https://nextjs.org/docs/app/guides)
- [Next.js Best Practices 2025](https://javascript.plainenglish.io/next-js-15-in-2025-features-best-practices-and-why-its-still-the-framework-to-beat-a535c7338ca8)
- [TypeScript Configuration](https://nextjs.org/docs/app/api-reference/config/typescript)

---

## Database & ORM

### Supabase + Prisma ORM
| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| Supabase | Latest | PostgreSQL backend | Provides PostgreSQL + Auth + Real-time. Strong RLS for multi-tenant isolation. |
| Prisma | 7.2.x | Type-safe ORM | Best-in-class TypeScript support. Critical for booking race condition handling. |
| @prisma/client | 7.2.x | Prisma client | Auto-generated based on schema |

**Confidence:** HIGH (verified via [Prisma 7.2.0 release](https://www.prisma.io/blog/announcing-prisma-orm-7-2-0), [Supabase docs](https://supabase.com/docs/guides/getting-started/architecture))

**Why this combination:**
- Supabase provides managed PostgreSQL with row-level security (RLS)
- Prisma adds type-safe ORM layer with transaction support
- Together: RLS handles tenant isolation, Prisma handles booking concurrency

### Critical Pattern: Preventing Double-Bookings

**The problem:** Concurrent booking requests can create race conditions where two users book the same slot.

**Prisma does NOT handle race conditions automatically.** You must implement one of these strategies:

#### 1. Optimistic Concurrency Control (Recommended for SYNQ)

Add a `version` field to booking-related tables:

```prisma
model Booking {
  id        String   @id @default(cuid())
  version   Int      @default(0) // Concurrency token
  // ... other fields
}
```

Update with version check:

```typescript
// Booking attempt includes version check
const result = await prisma.booking.update({
  where: {
    id: bookingId,
    version: currentVersion // Fails if version changed
  },
  data: {
    status: 'confirmed',
    version: { increment: 1 }
  }
})
```

If update returns 0 rows, another transaction modified the record - reject booking.

**Pros:** No locks, good for distributed systems
**Cons:** Requires retry logic on client

#### 2. Database Transactions with Serializable Isolation

```typescript
await prisma.$transaction(
  async (tx) => {
    // Check availability
    const available = await tx.slot.findFirst({
      where: { id: slotId, status: 'available' }
    });

    if (!available) throw new Error('Slot unavailable');

    // Book it
    await tx.booking.create({ data: { slotId, userId } });
    await tx.slot.update({
      where: { id: slotId },
      data: { status: 'booked' }
    });
  },
  {
    isolationLevel: 'Serializable' // Prevents concurrent modifications
  }
);
```

**Pros:** Database-enforced correctness
**Cons:** Potential deadlocks under high concurrency

**Recommendation:** Start with optimistic concurrency control (simpler, scales better). Add serializable transactions only if race conditions occur in production.

**Sources:**
- [Prisma High-Concurrency Booking System](https://dev.to/zenstack/how-to-build-a-high-concurrency-ticket-booking-system-with-prisma-184n)
- [Prisma Transactions Reference](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Prisma Race Conditions Discussion](https://github.com/prisma/prisma/discussions/10709)

### Supabase-Specific Patterns

#### Row-Level Security (RLS) for Multi-Tenant Isolation

SYNQ serves multiple wellness businesses - each must see only their own data.

**Pattern:** Add `tenant_id` column + RLS policies

```sql
-- Add tenant_id to booking table
ALTER TABLE bookings ADD COLUMN tenant_id UUID REFERENCES businesses(id);

-- RLS policy: users only see their tenant's bookings
CREATE POLICY "Users see own tenant bookings"
  ON bookings FOR SELECT
  USING (tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id');
```

**Critical:** Store `tenant_id` in user's `app_metadata` (not `raw_user_meta_data`) - users cannot modify app_metadata, preventing cross-tenant access.

**Benefits:**
- Database-enforced isolation (not app-layer)
- Even if application has bugs, users can't access other tenants' data

**Sources:**
- [Supabase RLS Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Multi-Tenant RLS Patterns](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)
- [Supabase Multi-Tenancy Best Practices](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2)

#### Connection Management for Next.js Development

Prisma + Next.js dev hot-reloading causes "too many connections" errors.

**Solution:** Singleton pattern in development

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**Production:** Configure connection pool: default is `num_cpus * 2 + 1`. For serverless, start with `connection_limit=1`.

**Sources:**
- [Prisma Next.js Production Guide](https://www.digitalapplied.com/blog/prisma-orm-production-guide-nextjs)
- [Prisma Best Practices](https://codeit.mk/home/blog/Prisma-Best-Practices-for-Node.js-Developers--A-Comprehensive-Guide)

---

## Styling & UI Components

### Tailwind CSS v3 (Defer v4 Migration)
| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| Tailwind CSS | 3.4.x | Utility-first CSS | Industry standard. v4 is stable but requires CSS-first config migration. |
| shadcn/ui | Latest | Component library | Copy-paste components built on Radix + Tailwind. Own the code. |
| Radix UI | Latest | Headless primitives | Accessible UI primitives (Dialog, Dropdown, etc.) |

**Confidence:** HIGH (verified via [Tailwind v4 release](https://tailwindcss.com/blog/tailwindcss-v4), [shadcn/ui docs](https://ui.shadcn.com/))

**Why Tailwind v3 (not v4):**
- Tailwind v4 released Jan 22, 2025 - very recent
- Requires migration to CSS-first config (no more `tailwind.config.js`)
- Requires Node.js 20+, Safari 16.4+, Chrome 111+
- **Recommendation:** Stay on v3.4 until v4 ecosystem matures (Q2-Q3 2025)

**Why shadcn/ui:**
- Not a package - you copy/paste components into your codebase
- Built on Radix (accessible primitives) + Tailwind
- Full customization - you own the code
- Includes Calendar, Dialog, Form, Select - all needed for booking UI

**Alternative considered:** Origin UI (shadcn-compatible, more components) - viable if shadcn selection is insufficient.

**Sources:**
- [Tailwind v4 Migration Guide](https://medium.com/better-dev-nextjs-react/tailwind-v4-migration-from-javascript-config-to-css-first-in-2025-ff3f59b215ca)
- [shadcn/ui Overview](https://ui.shadcn.com/)
- [shadcn vs Radix vs Tailwind UI](https://javascript.plainenglish.io/shadcn-ui-vs-radix-ui-vs-tailwind-ui-which-should-you-choose-in-2025-b8b4cadeaa25)

---

## Internationalization (i18n)

### next-intl
| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| next-intl | Latest | i18n for Next.js | Best-in-class for App Router. ICU message syntax. TypeScript autocomplete. |

**Confidence:** HIGH (verified via [next-intl docs](https://next-intl-docs.vercel.app/), [next-intl 2025 guide](https://www.buildwithmatija.com/blog/nextjs-internationalization-guide-next-intl-2025))

**Why next-intl:**
- Built specifically for Next.js App Router
- TypeScript autocompletion for message keys
- ICU message syntax (handles plurals, dates, complex Japanese formatting)
- Locale support: Use `"ja-JP"` for Japan

**Japanese-specific features:**
- Japanese calendar support: `"ja-JP-u-ca-japanese"` for date formatting
- ICU syntax handles honorifics, counters, complex pluralization

**Configuration:**
```typescript
// i18n.config.ts
export const locales = ['ja', 'en'] as const;
export const defaultLocale = 'ja';
```

**Sources:**
- [next-intl Complete Setup Guide](https://www.buildwithmatija.com/blog/nextjs-internationalization-guide-next-intl-2025)
- [Internationalization Best Practices](https://arnab-k.medium.com/internationalization-i18n-in-next-js-a-complete-guide-f62989f6469b)

---

## Date & Time Handling

### date-fns v4
| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| date-fns | 4.1.x | Date manipulation | Functional API, tree-shakeable, first-class timezone support (v4). |
| @date-fns/tz | Latest | Timezone support | Time zone handling with TZDate class |

**Confidence:** HIGH (verified via [date-fns v4 release](https://blog.date-fns.org/v40-with-time-zone-support/), [date-fns GitHub](https://github.com/date-fns/date-fns))

**Why date-fns over Day.js:**
- date-fns v4 added first-class timezone support (`TZDate` class)
- Functional API (no mutable state like Moment)
- Tree-shakeable (smaller bundles)
- Strong TypeScript support
- 200+ functions for date manipulation

**Day.js alternative:** Valid if you prefer chainable Moment-like API (46.2k stars vs 37.7k). But date-fns v4 timezone support makes it superior for booking systems spanning timezones.

**Critical for SYNQ:** Japan uses JST (UTC+9). Wellness businesses may schedule across dates. Use timezone-aware dates:

```typescript
import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';

// Create timezone-aware date
const bookingTime = new TZDate('2026-02-04T10:00:00', 'Asia/Tokyo');
const formatted = format(bookingTime, 'PPpp', { locale: ja });
```

**Sources:**
- [date-fns vs Day.js Comparison](https://www.dhiwise.com/post/date-fns-vs-dayjs-the-battle-of-javascript-date-libraries)
- [date-fns v4 Timezone Support](https://blog.date-fns.org/v40-with-time-zone-support/)

---

## Calendar & Scheduling UI

### React-based Calendar Components
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-day-picker | Latest | Date selection | Single date picker, date ranges. Foundation for shadcn Calendar. |
| react-big-calendar | Latest | Event calendar | Full calendar view (month/week/day) with drag-drop events. |

**Confidence:** MEDIUM (options verified via web search, not Context7)

**Recommendation for SYNQ:**

**Option A: Build with react-day-picker + shadcn Calendar (Recommended)**
- shadcn/ui includes Calendar component (built on react-day-picker)
- Lightweight, customizable, matches design system
- Good for: selecting appointment dates, viewing availability
- 6M+ weekly downloads, accessible, integrates with shadcn forms

**Option B: react-big-calendar (for complex scheduling views)**
- Full Outlook/Google Calendar-like interface
- Month/week/day/agenda views
- Drag-and-drop event management
- Use if: businesses need to see full schedule overview
- Integrates with date-fns localizer

**Start with Option A.** react-day-picker + shadcn covers MVP (customer picks date/time). Add react-big-calendar later if business dashboard needs complex scheduling views.

**Sources:**
- [React Calendar Components 2025](https://www.builder.io/blog/best-react-calendar-component-ai)
- [react-day-picker Official](https://daypicker.dev/)
- [react-big-calendar GitHub](https://github.com/jquense/react-big-calendar)

---

## Client-Side Data Fetching

### SWR
| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| SWR | Latest | Client data fetching | Vercel's data fetching library. Handles caching, revalidation, optimistic updates. |

**Confidence:** HIGH (verified via [SWR official docs](https://swr.vercel.app/docs/with-nextjs))

**Why SWR for booking system:**
- Automatic revalidation on focus (user returns to tab, sees fresh availability)
- Optimistic UI updates (booking confirms immediately, rolls back on error)
- Dedupe concurrent requests (multiple components fetching same slot)
- Built-in error retry with exponential backoff

**App Router considerations:**
- Import SWR hooks in Client Components (`'use client'`)
- Server-side prefetch: pass initial data via `SWRConfig` fallback

```typescript
// Client Component for availability
'use client';
import useSWR from 'swr';

export function AvailabilityCalendar({ initialData }) {
  const { data, error, mutate } = useSWR(
    '/api/availability',
    fetcher,
    {
      fallbackData: initialData,
      revalidateOnFocus: true // Refresh when user returns to tab
    }
  );

  // Optimistic booking update
  const handleBook = async (slotId) => {
    mutate(
      optimisticallyUpdatedData, // Show booked immediately
      { revalidate: false }
    );

    try {
      await bookSlot(slotId);
    } catch (error) {
      mutate(); // Revert on error
    }
  };
}
```

**Sources:**
- [SWR with Next.js App Router](https://swr.vercel.app/docs/with-nextjs)
- [SWR Best Practices 2025](https://arnab-k.medium.com/optimizing-data-fetching-in-next-js-with-swr-best-practices-560ff749e2c9)

---

## Form Handling & Validation

### React Hook Form + Zod + next-safe-action
| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| react-hook-form | Latest | Client form state | Industry standard. Minimal re-renders. |
| zod | Latest | Schema validation | TypeScript-first validation. Share schemas client/server. |
| @hookform/resolvers | Latest | Zod + RHF integration | Connects Zod schemas to React Hook Form |
| next-safe-action | Latest | Type-safe Server Actions | Validates Server Actions with Zod schemas |

**Confidence:** HIGH (verified via multiple 2025 guides)

**Why this combination:**

1. **react-hook-form:** Manages client-side form state (minimal re-renders, great DX)
2. **zod:** Defines validation schemas (shared between client and server)
3. **next-safe-action:** Wraps Server Actions with type-safe validation

**Pattern: Both-sides validation**

```typescript
// shared/schemas.ts
import { z } from 'zod';

export const bookingSchema = z.object({
  slotId: z.string().cuid(),
  userId: z.string().cuid(),
  notes: z.string().max(500).optional()
});

// app/actions.ts (Server Action)
'use server';
import { action } from '@/lib/safe-action';
import { bookingSchema } from '@/shared/schemas';

export const createBooking = action
  .schema(bookingSchema)
  .action(async ({ parsedInput }) => {
    // Server-side validation passed, proceed with booking
    const booking = await prisma.booking.create({
      data: parsedInput
    });
    return booking;
  });

// app/booking-form.tsx (Client Component)
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bookingSchema } from '@/shared/schemas';

export function BookingForm() {
  const form = useForm({
    resolver: zodResolver(bookingSchema) // Client-side validation
  });

  const onSubmit = async (data) => {
    const result = await createBooking(data); // Server validates again
    if (result.serverError) {
      // Handle server validation error
    }
  };
}
```

**Key benefits:**
- Schema defined once, used on client AND server
- Client validation provides instant feedback
- Server validation prevents malicious requests
- Full TypeScript type inference

**Sources:**
- [Next.js Form Validation with Zod](https://dev.to/bookercodes/nextjs-form-validation-on-the-client-and-server-with-zod-lbc)
- [Both-Sides Validation Guide](https://dev.to/arnaudrenaud/both-sides-form-validation-with-nextjs-react-hook-form-next-safe-action-1di1)
- [next-safe-action Official Docs](https://next-safe-action.dev/)
- [React Hook Form + Server Actions](https://markus.oberlehner.net/blog/using-react-hook-form-with-react-19-use-action-state-and-next-js-15-app-router/)

---

## Email Sending

### Resend (with caveats)
| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| Resend | Latest | Transactional email | Developer-friendly API. React Email templates. Next.js integration. |
| react-email | Latest | Email templates | Build emails with React components |

**Confidence:** MEDIUM (verified via web search, but concerns noted)

**Why Resend:**
- Built for developers (simple API)
- React Email templates (reuse components)
- Next.js Server Actions integration
- Good analytics and logging

**CONCERNS (from 2025 community feedback):**
- **Slow spin-up time:** Users report 1min+ delays for confirmation emails
- Unclear if this is free tier limitation or general issue
- Limited component library for templates

**Recommendation:**
- **For MVP:** Use Resend (easiest integration, good DX)
- **Monitor:** Track email delivery times in production
- **Fallback plan:** If delays are unacceptable, migrate to SendGrid (more mature, predictable performance)

**Alternative: SendGrid**
- More mature platform
- Predictable performance
- More complex setup (requires DKIM/SPF DNS configuration)
- Better for high-volume production use

**Configuration (Resend):**
```typescript
// app/actions.ts
'use server';
import { Resend } from 'resend';
import { BookingConfirmationEmail } from '@/emails/booking-confirmation';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBookingConfirmation(booking) {
  await resend.emails.send({
    from: 'noreply@synq.jp',
    to: booking.userEmail,
    subject: '予約確認 - SYNQ',
    react: BookingConfirmationEmail({ booking })
  });
}
```

**Sources:**
- [Resend with Next.js](https://resend.com/nextjs)
- [Resend Review 2025](https://www.toksta.com/products/resend)
- [5 Best Email Services for Next.js](https://dev.to/ethanleetech/5-best-email-services-for-nextjs-1fa2)

---

## Installation Commands

### Initial Setup
```bash
# Core framework
npm install next@15 react@19 react-dom@19

# TypeScript
npm install -D typescript @types/react @types/node

# Database & ORM
npm install @prisma/client@7
npm install -D prisma@7

# Styling & UI
npm install tailwindcss@3 postcss autoprefixer
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu # Radix primitives
# Install shadcn via CLI: npx shadcn-ui@latest init

# Internationalization
npm install next-intl

# Date handling
npm install date-fns@4 @date-fns/tz

# Calendar components
npm install react-day-picker # Included in shadcn Calendar
# Optional: npm install react-big-calendar (if complex scheduling needed)

# Data fetching
npm install swr

# Forms & validation
npm install react-hook-form zod @hookform/resolvers
npm install next-safe-action @next-safe-action/adapter-react-hook-form

# Email
npm install resend react-email

# Supabase (if not using Supabase CLI)
npm install @supabase/supabase-js
```

### Development Dependencies
```bash
npm install -D @types/react @types/node
npm install -D eslint eslint-config-next
npm install -D prettier prettier-plugin-tailwindcss
```

---

## Environment Variables

```bash
# .env.local
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..." # For migrations (Supabase Pooler)

NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="xxx"
SUPABASE_SERVICE_ROLE_KEY="xxx"

RESEND_API_KEY="re_xxx"

NODE_ENV="development"
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| ORM | Prisma 7 | Drizzle ORM | Drizzle has lighter bundle but less mature ecosystem. Prisma's transaction support critical for bookings. |
| Email | Resend (with monitoring) | SendGrid | SendGrid more mature but complex setup. Start with Resend, migrate if needed. |
| Date library | date-fns v4 | Day.js | Day.js is lighter but date-fns v4 timezone support is superior for booking systems. |
| Calendar UI | react-day-picker (shadcn) | react-big-calendar | Start simple with shadcn. Add react-big-calendar only if business dashboard needs complex views. |
| Styling | Tailwind v3 | Tailwind v4 | v4 too new (Jan 2025), requires CSS-first config migration. Defer until Q3 2025. |
| i18n | next-intl | next-i18next | next-intl built for App Router, better TypeScript DX. |
| Forms | React Hook Form + next-safe-action | Formik | RHF is faster, smaller. Formik is legacy. |

---

## Deployment Considerations

### Vercel (Recommended)
- Built by Next.js creators
- Zero-config deployment
- Edge Functions for auth
- Preview deployments per PR

### Supabase Production Checklist
- Enable connection pooling (PgBouncer)
- Configure RLS policies (test thoroughly!)
- Set up database backups
- Monitor connection pool usage

### Prisma Production Checklist
- Use `prisma migrate deploy` (NOT `prisma migrate dev`)
- Configure connection pool: start with `connection_limit=10`
- Enable query logging in dev, disable in production
- Set up Prisma Accelerate for edge/serverless (optional)

---

## What NOT to Use

| Technology | Why Avoid |
|------------|-----------|
| Moment.js | Deprecated. Large bundle, mutable state, no tree-shaking. Use date-fns or Day.js. |
| Formik | Legacy. React Hook Form is faster, smaller, better DX. |
| REST API in Next.js | Use Server Actions instead. Simpler, type-safe, no separate API routes. |
| Global CSS files | Use Tailwind + CSS Modules. Avoid large global.css. |
| Unvalidated Server Actions | ALWAYS validate with Zod + next-safe-action. Never trust client input. |
| Prisma migrations in production | Use `prisma migrate deploy`, NOT `prisma migrate dev`. |
| Client-side timezone conversions | Use server-side with date-fns/tz. Client timezones are unreliable. |

---

## Critical Patterns Summary

1. **Double-booking prevention:** Optimistic concurrency control (version field) OR serializable transactions
2. **Multi-tenant isolation:** Supabase RLS with `tenant_id` in `app_metadata`
3. **Connection pooling:** Singleton pattern in dev, configure limits in production
4. **Form validation:** Both client (React Hook Form + Zod) and server (next-safe-action + Zod)
5. **Date handling:** Always use timezone-aware dates (`TZDate` from @date-fns/tz)
6. **Email delivery:** Monitor Resend delays, have SendGrid migration plan ready

---

## Next Steps for Implementation

1. **Phase 0: Setup**
   - Initialize Next.js 15 with TypeScript strict mode
   - Set up Prisma + Supabase connection with singleton pattern
   - Configure RLS policies for tenant isolation

2. **Phase 1: Core Booking Schema**
   - Design Prisma schema with `version` field for concurrency control
   - Implement basic booking transaction logic
   - Test race condition handling

3. **Phase 2: UI Foundation**
   - Set up Tailwind + shadcn/ui
   - Build date picker with react-day-picker (shadcn Calendar)
   - Configure next-intl for Japanese locale

4. **Phase 3: Forms & Validation**
   - Set up React Hook Form + Zod schemas
   - Implement next-safe-action for Server Actions
   - Test client/server validation flow

5. **Phase 4: Email & Notifications**
   - Configure Resend + React Email templates
   - Monitor email delivery times
   - Set up error logging for failures

---

## Version Summary (for reference)

| Package | Version | Released | Notes |
|---------|---------|----------|-------|
| Next.js | 15.5.x | Jan 2026 | Stable. Next.js 16 available but not required. |
| React | 19.x | Oct 2024 | Stable |
| Prisma | 7.2.0 | Dec 2025 | Latest stable |
| Tailwind | 3.4.x | Current | v4 defer until Q3 2025 |
| date-fns | 4.1.0 | 2025 | First-class timezone support |
| TypeScript | 5.x | Current | Stable |

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Core framework (Next.js) | HIGH | Official docs, 2025 guides verified |
| Database (Prisma + Supabase) | HIGH | Official docs, community patterns verified |
| Concurrency patterns | HIGH | Multiple authoritative sources on Prisma transactions |
| UI (Tailwind + shadcn) | HIGH | Widespread adoption, official docs |
| Date handling | HIGH | date-fns v4 official release notes verified |
| Email (Resend) | MEDIUM | Community reports of delays, needs monitoring |
| Calendar components | MEDIUM | Options verified but not Context7-confirmed |

---

## Sources

### Core Framework
- [Next.js App Router Best Practices 2025](https://javascript.plainenglish.io/next-js-15-in-2025-features-best-practices-and-why-its-still-the-framework-to-beat-a535c7338ca8)
- [Next.js Official Documentation](https://nextjs.org/docs/app)
- [Next.js 15.5 Release](https://nextjs.org/blog/next-15-5)

### Database & ORM
- [Prisma 7.2.0 Release](https://www.prisma.io/blog/announcing-prisma-orm-7-2-0)
- [Prisma High-Concurrency Booking Systems](https://dev.to/zenstack/how-to-build-a-high-concurrency-ticket-booking-system-with-prisma-184n)
- [Prisma Transactions Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Supabase Architecture](https://supabase.com/docs/guides/getting-started/architecture)
- [Supabase RLS Multi-Tenant Patterns](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)

### UI & Styling
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind v4 Release](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind v4 Migration Guide](https://medium.com/better-dev-nextjs-react/tailwind-v4-migration-from-javascript-config-to-css-first-in-2025-ff3f59b215ca)

### Internationalization
- [next-intl 2025 Complete Guide](https://www.buildwithmatija.com/blog/nextjs-internationalization-guide-next-intl-2025)
- [next-intl Official Documentation](https://next-intl-docs.vercel.app/)

### Date & Time
- [date-fns v4 with Timezone Support](https://blog.date-fns.org/v40-with-time-zone-support/)
- [date-fns vs Day.js Comparison](https://www.dhiwise.com/post/date-fns-vs-dayjs-the-battle-of-javascript-date-libraries)

### Calendar Components
- [React Calendar Components 2025](https://www.builder.io/blog/best-react-calendar-component-ai)
- [react-day-picker Official](https://daypicker.dev/)
- [react-big-calendar GitHub](https://github.com/jquense/react-big-calendar)

### Data Fetching
- [SWR with Next.js App Router](https://swr.vercel.app/docs/with-nextjs)
- [SWR Best Practices 2025](https://arnab-k.medium.com/optimizing-data-fetching-in-next-js-with-swr-best-practices-560ff749e2c9)

### Forms & Validation
- [Next.js Zod Form Validation](https://dev.to/bookercodes/nextjs-form-validation-on-the-client-and-server-with-zod-lbc)
- [Both-Sides Validation with next-safe-action](https://dev.to/arnaudrenaud/both-sides-form-validation-with-nextjs-react-hook-form-next-safe-action-1di1)
- [next-safe-action Official Documentation](https://next-safe-action.dev/)

### Email
- [Resend with Next.js](https://resend.com/nextjs)
- [Resend Review 2025](https://www.toksta.com/products/resend)
- [5 Best Email Services for Next.js](https://dev.to/ethanleetech/5-best-email-services-for-nextjs-1fa2)
