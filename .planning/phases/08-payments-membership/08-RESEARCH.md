# Phase 8: Payments & Membership - Research

**Researched:** 2026-03-13
**Domain:** Stripe one-time checkout, QR code generation/scanning, prepaid session pack fulfillment
**Confidence:** HIGH (core Stripe patterns), MEDIUM (QR scanning library choice), HIGH (architecture)

---

## Summary

This phase adds prepaid session pack purchasing (one-time Stripe Checkout), QR code generation for customers, and QR redemption scanning for staff. The tech stack is already well-suited: Next.js App Router route handlers for the Stripe webhook, Prisma interactive transactions for atomic ticket-balance decrements, and Zod (already in use) for all input validation.

The architecture follows a clear flow: customer selects a session pack plan → Stripe hosted checkout (one-time `mode: 'payment'`) → `checkout.session.completed` webhook fires → Prisma atomically credits `ticketBalance` on the `Customer` record → customer sees QR code encoding their `customerId` → staff scans QR on a mobile page → API atomically decrements balance and logs the redemption.

Apple Pay requires **no extra integration code** on Stripe Checkout, but does require domain registration in the Stripe Dashboard before it will appear. Japan's 3DS mandate (effective April 2025) is **automatically handled** by Stripe when using hosted Checkout—Stripe triggers 3DS as required by Japanese issuer/JCA guidelines without merchant-side configuration. JPY is a **zero-decimal currency** in Stripe: `amount: 5000` means 5000 yen (not multiplied by 100).

**Primary recommendation:** Use Stripe hosted Checkout (`mode: 'payment'`) with pre-created Products/Prices in the Stripe Dashboard for each session pack tier. Pass `customerId` and `packId` in checkout session `metadata`. In the webhook, use a Prisma interactive transaction to atomically increment `ticketBalance` and create a `PaymentTransaction` record. For QR: generate client-side with `react-qr-code`, scan with `@yudiel/react-qr-scanner` on the staff redemption page.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` (server) | ^20.4.0 | Create checkout sessions, verify webhooks, retrieve sessions | Official Stripe Node SDK, current major |
| `@stripe/stripe-js` | ^7.3.0 | Client-side Stripe.js (needed if ever adding Payment Element; also loads Stripe.js asynchronously) | Official client SDK |
| `react-qr-code` | ^2.0.18 | SVG QR code generation client-side | Lightweight, no canvas needed, TypeScript support, 337+ dependents, actively maintained |
| `@yudiel/react-qr-scanner` | ^2.5.1 | Camera-based QR scanning in staff mobile browser | Actively maintained (last publish 2 months ago), uses WebRTC+ZXing, works in Next.js |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | ^4.3.6 | Already installed — validate webhook metadata, API inputs | All API endpoints (existing pattern) |
| `@prisma/client` | ^6.x | Already installed — atomic DB operations | Ticket balance increment/decrement |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-qr-code` | `qrcode.react` | Both work; `qrcode.react` is older and lower weekly downloads |
| `@yudiel/react-qr-scanner` | `html5-qrcode` | html5-qrcode is older; @yudiel is more actively maintained in 2025 |
| Stripe hosted Checkout | Stripe Payment Element (embedded) | Embedded gives more UI control but requires more code; hosted is simpler and complies with Japan 3DS automatically |
| Pre-created Prices | `price_data` inline | `price_data` creates archived prices each time; pre-created Prices are reusable and manageable in Dashboard |

**Installation:**
```bash
npm install stripe @stripe/stripe-js react-qr-code @yudiel/react-qr-scanner
```

---

## Architecture Patterns

### Recommended Project Structure
```
app/
├── api/
│   ├── payments/
│   │   ├── checkout/
│   │   │   └── route.ts         # POST: create Stripe checkout session
│   │   └── webhook/
│   │       └── route.ts         # POST: handle Stripe webhook events
│   └── sessions/
│       └── redeem/
│           └── route.ts         # POST: staff scans QR, decrements balance
├── [locale]/
│   ├── (user)/
│   │   └── account/
│   │       └── sessions/
│   │           └── page.tsx     # Customer: buy packs, see QR code, history
│   └── (admin)/
│       └── admin/
│           ├── payments/
│           │   └── page.tsx     # Admin: payment history, customer balances
│           └── session-plans/
│               └── page.tsx     # Admin: manage pack plans (CRUD)
└── [locale]/
    └── (public)/
        └── staff/
            └── scan/
                └── page.tsx     # Staff: QR scanner page (mobile-optimized)

src/
├── lib/
│   ├── services/
│   │   └── payment.service.ts   # Business logic: create session, fulfill order
│   └── validations/
│       └── payment.ts           # Zod schemas for payment inputs
└── components/
    └── payments/
        ├── session-pack-card.tsx
        ├── qr-code-display.tsx
        └── qr-scanner.tsx

prisma/
└── schema.prisma                # Add: SessionPlan, PaymentTransaction models
```

### Pattern 1: Stripe Checkout Session Creation (Server Route Handler)

**What:** API route that creates a Stripe Checkout session for a selected session plan, redirects customer to Stripe's hosted page.
**When to use:** Customer clicks "Buy" on a session pack.

```typescript
// Source: https://docs.stripe.com/checkout/quickstart?client=next
// app/api/payments/checkout/route.ts
import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const checkoutSchema = z.object({
  planId: z.string().min(1),  // Our internal SessionPlan.id
  stripePriceId: z.string().startsWith('price_'),
})

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const customerId = cookieStore.get('customerId')?.value
  if (!customerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const origin = request.nextUrl.origin
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',                    // ONE-TIME payment, not subscription
    line_items: [{ price: parsed.data.stripePriceId, quantity: 1 }],
    metadata: {
      customerId,                        // Link back to our DB on webhook
      planId: parsed.data.planId,
    },
    success_url: `${origin}/ja/account/sessions?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/ja/account/sessions?cancelled=true`,
    // customer_email NOT needed — customer already identified by customerId
    // Apple Pay shown automatically when domain registered in Stripe Dashboard
    // 3DS handled automatically by Stripe for Japan JCA mandate
  })

  return NextResponse.redirect(session.url!, 303)
}
```

### Pattern 2: Stripe Webhook Handler

**What:** Route handler that receives `checkout.session.completed` and atomically credits the customer's ticket balance.
**When to use:** Stripe calls this after successful payment.

**CRITICAL:** Use `request.text()` not `request.json()` to preserve raw body for signature verification. Without the raw body, `constructEvent` throws a signature mismatch.

```typescript
// Source: https://docs.stripe.com/webhooks + verified by multiple sources
// app/api/payments/webhook/route.ts
import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const rawBody = await request.text()   // MUST be .text(), not .json()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { customerId, planId } = session.metadata ?? {}

    if (!customerId || !planId) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    // Idempotency: check if we already processed this Stripe session
    const existing = await prisma.paymentTransaction.findUnique({
      where: { stripeSessionId: session.id },
    })
    if (existing) {
      return NextResponse.json({ received: true })  // Already processed
    }

    // Atomic: credit balance + log transaction in one Prisma transaction
    await prisma.$transaction(async (tx) => {
      const plan = await tx.sessionPlan.findUniqueOrThrow({ where: { id: planId } })

      await tx.customer.update({
        where: { id: customerId },
        data: { ticketBalance: { increment: plan.sessionCount } },
      })

      await tx.paymentTransaction.create({
        data: {
          customerId,
          planId,
          stripeSessionId: session.id,
          amountJpy: session.amount_total ?? 0,  // Already in yen (zero-decimal)
          sessionCount: plan.sessionCount,
          status: 'COMPLETED',
        },
      })
    })
  }

  return NextResponse.json({ received: true })
}
```

### Pattern 3: Atomic Session Redemption (Staff QR Scan)

**What:** API route called when staff scans customer QR code. Decrements `ticketBalance` atomically, prevents negative balance.
**When to use:** Staff scans QR in location.

```typescript
// app/api/sessions/redeem/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { getAdminSession } from '@/lib/auth/admin'
import { z } from 'zod'

const redeemSchema = z.object({
  customerId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  // Staff must be authenticated as admin
  // (or use a separate staff auth token — see Open Questions)
  const isAdmin = await getAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = redeemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid QR data' }, { status: 400 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUniqueOrThrow({
        where: { id: parsed.data.customerId },
        select: { id: true, name: true, ticketBalance: true },
      })

      if (customer.ticketBalance <= 0) {
        throw new Error('NO_BALANCE')
      }

      const updated = await tx.customer.update({
        where: { id: customer.id },
        data: { ticketBalance: { decrement: 1 } },
        select: { ticketBalance: true },
      })

      await tx.sessionRedemption.create({
        data: {
          customerId: customer.id,
          redeemedAt: new Date(),
        },
      })

      return { customerName: customer.name, remainingBalance: updated.ticketBalance }
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_BALANCE') {
      return NextResponse.json({ error: 'No sessions remaining' }, { status: 422 })
    }
    return NextResponse.json({ error: 'Redemption failed' }, { status: 500 })
  }
}
```

### Pattern 4: QR Code Display (Customer Account Page)

```typescript
// Source: https://www.npmjs.com/package/react-qr-code
'use client'
import QRCode from 'react-qr-code'

// The QR value encodes the customer's UUID
// Staff scanner reads this UUID and calls /api/sessions/redeem
export function CustomerQRCode({ customerId }: { customerId: string }) {
  return (
    <QRCode
      value={customerId}
      size={256}
      bgColor="#FFFFFF"
      fgColor="#000000"
      level="M"   // Medium error correction — good for display screens
    />
  )
}
```

### Pattern 5: QR Scanner (Staff Mobile Page)

```typescript
// Source: https://github.com/yudielcurbelo/react-qr-scanner
'use client'
import { Scanner } from '@yudiel/react-qr-scanner'

export function StaffQRScanner() {
  const handleScan = async (result: string) => {
    const response = await fetch('/api/sessions/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: result }),
    })
    // Show success/error UI
  }

  return (
    <Scanner
      onScan={(detectedCodes) => {
        if (detectedCodes.length > 0) handleScan(detectedCodes[0].rawValue)
      }}
      onError={(error) => console.error(error)}
      constraints={{ facingMode: 'environment' }}  // Rear camera
    />
  )
}
```

### Anti-Patterns to Avoid

- **Calling `request.json()` in webhook handler:** Consumes the stream; `constructEvent` will fail with signature mismatch. Always use `request.text()` in the webhook route.
- **Trusting webhook metadata without DB lookup:** Always re-fetch the plan from DB inside the transaction to get authoritative `sessionCount`; don't trust what's in metadata.
- **Not checking for duplicate webhook events:** Stripe retries for 3 days. Without idempotency check on `stripeSessionId`, customers could receive double credits.
- **Decrementing balance without a transaction:** A race condition can allow negative balances. Always use `prisma.$transaction` for read-check-write operations.
- **Using `price_data` inline for every checkout session:** Creates archived prices each time; use pre-created Stripe Prices managed in Dashboard for session packs.
- **Forgetting JPY is zero-decimal:** `amount_total` from Stripe for a 5000 yen purchase is `5000`, not `500000`. Do not divide by 100.
- **Embedding the webhook secret in client code:** `STRIPE_WEBHOOK_SECRET` must be server-only; never expose to client bundles.
- **No auth on the staff QR scan endpoint:** The redemption endpoint must require admin/staff session — any anonymous call could drain customer balances.

---

## Prisma Schema Additions

The existing `Customer` model already has `ticketBalance Int @default(0)`. The following new models are needed:

```prisma
enum SessionPlanStatus {
  ACTIVE
  INACTIVE
}

enum PaymentStatus {
  COMPLETED
  REFUNDED
  FAILED
}

model SessionPlan {
  id           String            @id @default(uuid())
  name         String            // e.g., "5回券", "10回券"
  nameEn       String?
  sessionCount Int               // How many sessions this pack grants
  priceJpy     Int               // Display price in yen
  stripePriceId String           // Stripe Price ID (price_xxx)
  status       SessionPlanStatus @default(ACTIVE)
  displayOrder Int               @default(0)
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  transactions PaymentTransaction[]
}

model PaymentTransaction {
  id              String        @id @default(uuid())
  customerId      String
  customer        Customer      @relation(fields: [customerId], references: [id], onDelete: Restrict)
  planId          String
  plan            SessionPlan   @relation(fields: [planId], references: [id], onDelete: Restrict)
  stripeSessionId String        @unique  // For idempotency check
  amountJpy       Int           // Amount charged in yen
  sessionCount    Int           // Sessions credited
  status          PaymentStatus @default(COMPLETED)
  createdAt       DateTime      @default(now())

  @@index([customerId])
  @@index([createdAt])
}

model SessionRedemption {
  id          String   @id @default(uuid())
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id], onDelete: Restrict)
  redeemedAt  DateTime @default(now())
  redeemedBy  String?  // Admin/staff identifier (optional)

  @@index([customerId])
  @@index([redeemedAt])
}
```

Also add to `Customer`:
```prisma
// Add to Customer model relations:
paymentTransactions PaymentTransaction[]
sessionRedemptions  SessionRedemption[]
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment processing | Custom payment form | Stripe hosted Checkout | PCI compliance, 3DS, Apple Pay automatic |
| QR code rendering | Canvas drawing | `react-qr-code` | Error correction, standards compliance |
| QR code scanning | getUserMedia + canvas | `@yudiel/react-qr-scanner` | Camera permissions, decoding algorithm complexity |
| Webhook signature verification | HMAC from scratch | `stripe.webhooks.constructEvent()` | Timing-safe comparison, replay attack prevention |
| Idempotent DB writes | Custom lock table | Prisma `@unique` on `stripeSessionId` | DB-level uniqueness constraint is the simplest guarantee |

**Key insight:** Stripe's hosted checkout eliminates PCI scope, handles 3DS/Apple Pay automatically, and provides battle-tested fraud protection. Do not attempt to embed payment fields directly.

---

## Common Pitfalls

### Pitfall 1: Webhook Raw Body Parsing
**What goes wrong:** The webhook signature verification fails with "No signatures found matching the expected signature" even though the secret is correct.
**Why it happens:** Next.js App Router may buffer/parse the request body. If `request.json()` or any body parser runs before `stripe.webhooks.constructEvent()`, the raw bytes are gone.
**How to avoid:** In the webhook route handler, ALWAYS call `const rawBody = await request.text()` as the FIRST statement before any other logic. Never call `request.json()`.
**Warning signs:** `constructEvent` throws during local testing with Stripe CLI but the key looks correct.

### Pitfall 2: JPY Zero-Decimal Amount Confusion
**What goes wrong:** Amounts appear 100x too large or prices are calculated incorrectly.
**Why it happens:** Most Stripe tutorials use USD (multiply by 100 to get cents). JPY has no subunit — `amount: 5000` = 5000 yen.
**How to avoid:** When creating Stripe Prices for JPY, pass `unit_amount: 5000` for a 5000-yen pack. When reading `session.amount_total`, treat it directly as yen.
**Warning signs:** A ¥5000 pack shows as ¥500,000 on the UI.

### Pitfall 3: Duplicate Webhook Fulfillment
**What goes wrong:** Customer gets double session credits.
**Why it happens:** Stripe retries webhooks for up to 72 hours on non-2xx responses or network failures. Without idempotency, the webhook handler may run multiple times for the same payment.
**How to avoid:** Before crediting, check `paymentTransaction.findUnique({ where: { stripeSessionId: session.id } })`. If it exists, return `200` immediately without processing.
**Warning signs:** Customer reports double credits; `ticketBalance` is higher than expected.

### Pitfall 4: Negative Ticket Balance Race Condition
**What goes wrong:** Two simultaneous QR scans both read `ticketBalance: 1` and both succeed, leaving balance at `-1`.
**Why it happens:** Non-atomic read-check-write pattern without DB transaction.
**How to avoid:** Use `prisma.$transaction` for the read-balance + decrement + create-redemption sequence. The transaction will serialize the operations. Additionally, enforce `ticketBalance >= 0` at DB level with a Postgres `CHECK` constraint (added via raw SQL migration or Prisma `@db` attribute workaround).
**Warning signs:** `ticketBalance` goes negative; customers can redeem more sessions than purchased.

### Pitfall 5: Apple Pay Domain Not Registered
**What goes wrong:** Apple Pay button does not appear in Stripe Checkout for Apple device users.
**Why it happens:** Apple requires merchant domain verification. Stripe handles the merchant identity file, but the domain must be registered in the Stripe Dashboard first.
**How to avoid:** Register the production domain (and any staging domain) in Stripe Dashboard → Settings → Payment methods → Apple Pay domains before launch.
**Warning signs:** Apple Pay option missing in hosted checkout on iPhone; all other payment methods work.

### Pitfall 6: Camera Requires HTTPS
**What goes wrong:** QR scanner page does not access camera on mobile devices.
**Why it happens:** `getUserMedia` (camera API) is blocked on non-HTTPS origins except `localhost`.
**How to avoid:** Staff scan page must be served over HTTPS. Local dev works on `localhost`. Verify production deployment has valid SSL.
**Warning signs:** "Permission denied" or no camera prompt on staff scan page in staging.

### Pitfall 7: Stripe Webhook Secret Different per Environment
**What goes wrong:** Webhook verification fails in production after working locally.
**Why it happens:** The Stripe CLI for local dev generates a local webhook secret (`whsec_...`) different from the production endpoint secret.
**How to avoid:** Use separate env vars: `STRIPE_WEBHOOK_SECRET` for production (from Stripe Dashboard endpoint), `STRIPE_WEBHOOK_SECRET_LOCAL` for dev (from `stripe listen` CLI output). Or use the same var but set the correct value per environment.

---

## Code Examples

### Create Stripe Price for Session Pack (one-time, JPY, zero-decimal)
```typescript
// Source: https://docs.stripe.com/api/prices/create
// Run once in admin setup or via Stripe Dashboard
const price = await stripe.prices.create({
  currency: 'jpy',
  unit_amount: 5000,          // 5000 yen — zero-decimal, NO multiply by 100
  product_data: {
    name: '5回券 (5-session pack)',
  },
  // NO recurring field = one-time payment
})
// price.id = 'price_xxx' → store in SessionPlan.stripePriceId
```

### Retrieve Checkout Session on Success Page
```typescript
// Source: https://docs.stripe.com/checkout/quickstart?client=next
// app/[locale]/(user)/account/sessions/page.tsx
const sessionId = searchParams.get('session_id')
if (sessionId) {
  const stripeSession = await stripe.checkout.sessions.retrieve(sessionId)
  // stripeSession.payment_status === 'paid'
  // Show thank-you message; actual fulfillment already done by webhook
}
```

### Atomic Ticket Balance Increment (Prisma)
```typescript
// Source: https://www.prisma.io/docs/orm/prisma-client/queries/transactions
await prisma.$transaction(async (tx) => {
  await tx.customer.update({
    where: { id: customerId },
    data: { ticketBalance: { increment: plan.sessionCount } },
  })
  // Other operations in same transaction...
})
```

---

## Environment Variables Required

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...           # Server-only
STRIPE_WEBHOOK_SECRET=whsec_...         # Server-only (from Stripe Dashboard endpoint)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # Client-safe (if using Stripe.js)

# Dev (Stripe CLI local testing)
# Run: stripe listen --forward-to localhost:3000/api/payments/webhook
# The CLI outputs: "Ready! Your webhook signing secret is whsec_xxx"
# Use that whsec_xxx as STRIPE_WEBHOOK_SECRET during local dev
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe Pages Router (req/res, `bodyParser: false`) | App Router route handler (`request.text()`) | Next.js 13+ | Raw body access is cleaner |
| `price_data` inline in checkout | Pre-created Prices via API/Dashboard | Stripe 2020 | Prices are reusable, manageable |
| `stripe` v8 | `stripe` v20 | 2024-2025 | v18 had breaking changes (migration guide exists); v20 is current |
| Manual 3DS trigger for Japan | Automatic via Stripe (JCA mandate) | April 2025 | No merchant config needed for Checkout |
| `jsQR` (unmaintained) | `@yudiel/react-qr-scanner` (active) | 2024-2025 | jsQR no longer actively maintained |

**Deprecated/outdated:**
- `stripe` v8-v17: Major API changes across versions. Use v20.x.
- `bodyParser: false` in Next.js Pages Router: Not needed in App Router — just use `request.text()`.
- `@stripe/stripe-js` `loadStripe` with embedded Elements: Not needed for hosted Checkout redirect flow; only needed if building embedded payment UI later.

---

## Open Questions

1. **Staff authentication for QR scan endpoint**
   - What we know: The existing admin auth uses `admin_session` JWT cookie. Staff members likely share admin credentials today.
   - What's unclear: Should the `/staff/scan` route require full admin session, or a lighter "staff" auth? Is there a separate staff login flow in scope?
   - Recommendation: For Phase 8, re-use existing admin session cookie for the scan page (simplest, in-scope). The scan page lives at `/[locale]/(admin)/admin/scan/` under the admin shell. Dedicated staff auth is a future enhancement.

2. **Stripe Products: pre-create in Dashboard vs programmatic**
   - What we know: Stripe Prices can be created via API or Dashboard. For a fixed set of session pack tiers (e.g., 5, 10, 20 sessions), creating them in the Dashboard is simpler.
   - What's unclear: Admin UI says "create/edit/deactivate plans" — does this mean managing Stripe Prices programmatically from the admin UI?
   - Recommendation: Create an admin `SessionPlan` table that stores our plan metadata AND the `stripePriceId`. Admin can create Stripe Prices via Dashboard and paste the `price_xxx` ID into the admin UI. This avoids building a full Stripe Products management layer in Phase 8. Full programmatic Stripe Price creation via API can be added later.

3. **QR Code content: raw UUID vs signed token**
   - What we know: The QR encodes `customerId` (a UUID). A malicious actor who knows a customer UUID could theoretically call the redemption API directly.
   - What's unclear: Is the staff scan page publicly accessible or admin-protected?
   - Recommendation: The redemption API MUST require admin session auth. The QR code encoding the raw UUID is fine as long as the API enforces authentication. For extra security, a short-lived signed token could be used (but adds complexity; defer to Phase 9+).

4. **Webhook endpoint URL for production**
   - What we know: URL will be `https://[domain]/api/payments/webhook`.
   - What's unclear: Production domain is not confirmed in the codebase.
   - Recommendation: Register the Stripe webhook endpoint in Dashboard with the production domain before deployment. Use `stripe listen` CLI for local dev.

---

## Sources

### Primary (HIGH confidence)
- Stripe Docs: https://docs.stripe.com/checkout/quickstart?client=next — checkout session creation, App Router patterns
- Stripe Docs: https://docs.stripe.com/webhooks — webhook handler, `constructEvent`, `checkout.session.completed`
- Stripe Docs: https://docs.stripe.com/currencies — JPY zero-decimal confirmation, minimum 50 JPY
- Stripe Docs: https://docs.stripe.com/apple-pay — no config required for hosted Checkout; domain registration required
- Stripe Docs: https://docs.stripe.com/api/checkout/sessions/create — `mode: 'payment'`, `metadata`, `payment_intent_data`
- Stripe Docs: https://docs.stripe.com/api/prices/create — pre-created Prices vs `price_data`

### Secondary (MEDIUM confidence)
- npm: `react-qr-code` v2.0.18 — SVG QR generation, 337 dependents, TypeScript support (verified via WebSearch)
- npm: `@yudiel/react-qr-scanner` v2.5.1 — camera-based scanning, last published 2 months ago (verified via WebSearch)
- Stripe: https://stripe.com/en-jp/resources/more/3d-secure-mandatory-for-ecommerce-in-japan — Japan 3DS mandate April 2025; Stripe triggers 3DS automatically (confirmed by WebSearch, partial doc access)
- npm: `stripe` v20.4.0 — current major version as of March 2026 (confirmed via WebSearch npm registry)

### Tertiary (LOW confidence)
- Medium: https://medium.com/@gragson.john/stripe-checkout-and-webhook-in-a-next-js-15-2025-925d7529855e — Next.js 15 Stripe integration patterns (single blog source, not official; patterns cross-verified with official docs)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Stripe Node SDK version verified via npm registry; QR library versions verified via WebSearch
- Architecture: HIGH — patterns verified against official Stripe docs and existing codebase conventions
- Pitfalls: HIGH — raw body issue and JPY zero-decimal verified against official Stripe docs; duplicate webhook and race condition are well-established distributed systems patterns
- Japan 3DS: MEDIUM — Stripe automatically handles it confirmed via multiple sources, but partial doc access; planner should note this for testing

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (30 days — Stripe APIs are stable; QR libraries are stable)
