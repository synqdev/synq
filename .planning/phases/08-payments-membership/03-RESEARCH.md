# Phase 3: Payments & Membership - Research

**Researched:** 2026-02-20
**Domain:** Stripe payments, QR code membership, Next.js App Router webhook integration
**Confidence:** HIGH (core stack), MEDIUM (QR scan approach), HIGH (webhook patterns)

---

## Summary

Phase 3 introduces Stripe-powered membership purchases, QR code generation for member cards, and staff-facing scan verification. The project already uses Jose (JWT-capable), Prisma, and Next.js App Router — all of which compose cleanly with Stripe's current SDK. No major architectural pivots are required; this phase extends existing service layer patterns.

The Stripe integration uses hosted Checkout (redirect-based), which gives Apple Pay support for free with zero domain registration overhead. Webhook handling requires reading the raw request body with `await request.text()` — not `request.json()` — in Next.js App Router route handlers; this is the single most common failure point reported across community resources. Metadata must be placed in `subscription_data.metadata` (not top-level `metadata`) for it to propagate through to subscription webhook events.

QR codes encode a signed JWT containing the customer's internal ID. The `qrcode` npm package generates them server-side as data URL strings. Staff scan via a `'use client'` component using camera APIs with `next/dynamic` and `ssr: false` to avoid SSR errors from browser-only camera access.

**Primary recommendation:** Use Stripe hosted Checkout (not Payment Element) with `mode: 'subscription'` for recurring memberships. Apple Pay works automatically. Store `stripeCustomerId` + `stripeSubscriptionId` + `subscriptionStatus` on the `Customer` model. Use `subscription_data.metadata` to pass internal customer ID through checkout.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` | 20.x (latest) | Stripe Node.js SDK, server-side | Official Stripe SDK, v20 pins API to `2026-01-28.clover` |
| `qrcode` | latest (1.5.x) | QR code generation server-side | Works in Node.js, async/await API, data URL + SVG output |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-qr-code` | latest | QR SVG rendering in React | Customer-facing display (client component) |
| `@yudiel/react-qr-scanner` | latest | Camera-based QR scan | Staff scan page (requires `'use client'` + dynamic import) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Stripe hosted Checkout | Payment Element (embedded) | Embedded requires domain registration for Apple Pay, more code; hosted is simpler and Apple Pay is automatic |
| `qrcode` (Node.js) | `next-qrcode` | `next-qrcode` v2.5.1 is 2 years old; `qrcode` is actively maintained and works server-side |
| `@yudiel/react-qr-scanner` | `html5-qrcode` | `html5-qrcode` has ESM compatibility issues in Next.js; `@yudiel/react-qr-scanner` is a maintained React-native wrapper |
| one-time `payment` mode | `subscription` mode | Membership with recurring billing requires `subscription` mode; one-time for ticket packs only |

**Installation:**
```bash
npm install stripe qrcode react-qr-code @yudiel/react-qr-scanner
npm install --save-dev @types/qrcode
```

---

## Architecture Patterns

### Recommended Project Structure

New files/directories following existing patterns:

```
prisma/
└── schema.prisma                  # Add MembershipPlan, Membership, Payment models

src/lib/
├── services/
│   ├── membership.service.ts      # MembershipPlan CRUD, Membership queries
│   ├── payment.service.ts         # Stripe session creation, webhook processing
│   └── qr.service.ts              # QR token generation + verification
├── stripe/
│   └── client.ts                  # Lazy Stripe singleton
└── validations/
    ├── membership.ts              # Zod schemas for plan/membership
    └── payment.ts                 # Zod schemas for checkout params

app/api/
├── stripe/
│   └── webhook/
│       └── route.ts               # Stripe webhook handler (raw body)
├── admin/
│   ├── membership-plans/
│   │   ├── route.ts               # GET (list), POST (create)
│   │   └── [id]/route.ts          # PUT (edit), DELETE (deactivate)
│   └── payments/
│       └── route.ts               # GET payment history
└── membership/
    ├── checkout/route.ts          # POST: create checkout session
    ├── qr/route.ts                # GET: generate QR data URL for customer
    └── verify/route.ts            # POST: verify QR scan (staff use)

app/[locale]/
├── (user)/
│   ├── membership/
│   │   ├── page.tsx               # Plan selection + purchase CTA
│   │   ├── success/page.tsx       # Post-checkout success
│   │   └── cancel/page.tsx        # Post-checkout cancel
│   └── account/
│       └── page.tsx               # Customer QR code display
└── (admin)/admin/
    ├── memberships/
    │   └── page.tsx               # Admin plan management
    ├── payments/
    │   └── page.tsx               # Payment history per customer
    └── scan/
        └── page.tsx               # Staff QR scanner
```

### Pattern 1: Lazy Stripe Singleton

**What:** Instantiate Stripe lazily to avoid `missing API key` errors during module loading at build time.
**When to use:** Always — required because Next.js may import the module before env vars are available.

```typescript
// Source: Stripe Node.js best practices (https://github.com/stripe/stripe-node)
// src/lib/stripe/client.ts

import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(key)
  }
  return _stripe
}
```

### Pattern 2: Checkout Session with Metadata

**What:** Create a Stripe Checkout Session for subscription, passing internal `customerId` via `subscription_data.metadata` so it survives through to subscription webhook events.
**When to use:** Every checkout initiation — `metadata` at top level stays with session only; `subscription_data.metadata` propagates to all subsequent subscription events.

```typescript
// Source: https://docs.stripe.com/metadata/use-cases
// app/api/membership/checkout/route.ts

import { getStripe } from '@/lib/stripe/client'
import { getCustomerSession } from '@/lib/auth/customer' // existing cookie-based auth

export async function POST(request: NextRequest) {
  const customerId = await getCustomerSession(request)
  if (!customerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { planId } = await request.json()
  // planId is your internal MembershipPlan.stripePriceId

  const stripe = getStripe()
  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_BASE_URL

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: planId, quantity: 1 }],
    // Link Stripe Customer to existing Customer for future lookups
    customer_email: customerEmail, // prefills checkout form
    metadata: {
      // top-level: available in checkout.session.completed only
      internalCustomerId: customerId,
    },
    subscription_data: {
      metadata: {
        // propagates to customer.subscription.* events
        internalCustomerId: customerId,
      },
    },
    success_url: `${origin}/membership/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/membership/cancel`,
  })

  return NextResponse.json({ url: session.url })
}
```

### Pattern 3: Webhook Handler with Raw Body

**What:** Stripe webhooks MUST use `await request.text()` (not `request.json()`) to get the raw body for signature verification. This is the number one failure point.
**When to use:** Always and only in the webhook route handler.

```typescript
// Source: https://docs.stripe.com/webhooks/signature
// app/api/stripe/webhook/route.ts

import { headers } from 'next/headers'
import { getStripe } from '@/lib/stripe/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // CRITICAL: Must use .text() not .json() — raw body required for signature
  const body = await request.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Respond 200 immediately; process synchronously or queue
  try {
    await handleStripeEvent(event)
  } catch (err) {
    console.error('Webhook processing error:', err)
    // Still return 200 to prevent Stripe retry storm for permanent errors
    // Return 500 only for transient errors you want retried
  }

  return NextResponse.json({ received: true })
}
```

### Pattern 4: Idempotent Webhook Event Handler

**What:** Stripe retries webhooks on 5xx or timeout. Store the Stripe event ID and skip if already processed.
**When to use:** In every webhook event handler that mutates database state.

```typescript
// src/lib/services/payment.service.ts
async function handleStripeEvent(event: Stripe.Event) {
  // Idempotency guard — check if event was already processed
  const existing = await prisma.stripeEvent.findUnique({
    where: { stripeEventId: event.id }
  })
  if (existing) return // Already processed

  await prisma.stripeEvent.create({
    data: { stripeEventId: event.id, processedAt: new Date() }
  })

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      await handleCheckoutComplete(session)
      break
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await handleSubscriptionChange(sub)
      break
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      await handleInvoicePaid(invoice)
      break
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      await handlePaymentFailed(invoice)
      break
    }
  }
}
```

### Pattern 5: QR Code Generation

**What:** Generate a signed JWT containing the customer's internal ID, encode it as a QR code data URL.
**When to use:** Customer requests their membership QR from the account page.

```typescript
// Source: node-qrcode API (https://github.com/soldair/node-qrcode)
// src/lib/services/qr.service.ts

import QRCode from 'qrcode'
import { SignJWT, jwtVerify } from 'jose'

const QR_SECRET = new TextEncoder().encode(
  process.env.QR_MEMBERSHIP_SECRET ?? 'dev-qr-secret'
)

export async function generateMembershipQR(customerId: string): Promise<string> {
  // Sign a short-lived JWT (e.g. 24h) — staff scan must happen while valid
  const token = await new SignJWT({ sub: customerId, type: 'membership' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(QR_SECRET)

  // Encode as data URL (PNG) for <img src={...} />
  const dataUrl = await QRCode.toDataURL(token, {
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2,
  })
  return dataUrl
}

export async function verifyMembershipQR(
  token: string
): Promise<{ customerId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, QR_SECRET)
    if (payload.type !== 'membership' || typeof payload.sub !== 'string') {
      return null
    }
    return { customerId: payload.sub }
  } catch {
    return null // expired or invalid
  }
}
```

### Anti-Patterns to Avoid

- **Using `request.json()` in webhook handler:** Consumes the stream; signature verification fails silently. Always use `request.text()`.
- **Storing `metadata` at top-level for subscriptions:** Top-level session `metadata` does not propagate to `customer.subscription.*` events. Use `subscription_data.metadata` for any data needed in subscription lifecycle events.
- **Trusting checkout success URL alone:** The success URL can be manipulated. Always confirm state via `checkout.session.completed` webhook before granting membership access.
- **No idempotency guard:** Stripe retries on timeout/5xx. Without checking if an event ID was already processed, you risk double-granting membership or double-crediting.
- **QR code with no expiry:** Static QR codes containing only a customer ID can be screenshot and shared. Use short-lived signed JWT (24h) so codes must be refreshed.
- **Importing QR scanner without `ssr: false`:** Camera APIs don't exist in Node.js. Any QR scanner component that accesses `navigator` or `MediaDevices` must use `next/dynamic` with `ssr: false`.
- **Initializing Stripe at module level:** `new Stripe(process.env.STRIPE_SECRET_KEY)` at module top level causes build failures when the env var is not present during SSR/build. Always lazy-initialize.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment form with card inputs | Custom card input UI | Stripe hosted Checkout | PCI compliance, Apple Pay, Google Pay, 3DS handling — all automatic |
| Apple Pay domain verification | Manual `.well-known` file serving | Stripe Checkout (hosted) | No domain registration needed; Stripe handles merchant validation |
| Subscription lifecycle state machine | Custom recurring billing | Stripe Billing + webhooks | Retries, dunning, prorations, invoice management handled by Stripe |
| QR token cryptography | Custom HMAC scheme | Jose library (already in project) | Already installed, Edge-compatible, same library used for admin JWT |
| Camera permission management | Custom getUserMedia wrapper | `@yudiel/react-qr-scanner` | Handles permission prompts, mobile camera switching, scan debouncing |
| Webhook retry deduplication | Custom retry tracking | `StripeEvent` model with event ID uniqueness | Simple pattern; unique constraint on `stripeEventId` is enough |

**Key insight:** Stripe's hosted Checkout eliminates the hardest compliance and UX problems. Any custom UI around payments requires PCI SAQ-A at minimum and Apple Pay domain verification — weeks of work that Stripe already solved.

---

## Common Pitfalls

### Pitfall 1: Webhook Raw Body
**What goes wrong:** Webhook signature verification fails with `"No signatures found matching the expected signature for payload"`.
**Why it happens:** `request.json()` parses and re-serializes the body, changing whitespace/key order. Stripe signs the exact bytes it sent.
**How to avoid:** Always use `const body = await request.text()` in webhook route handler. Never call `request.json()` first.
**Warning signs:** Works in Stripe CLI testing locally (raw text preserved) but fails in production.

### Pitfall 2: Metadata Not Propagating to Subscription Events
**What goes wrong:** `customer.subscription.updated` webhook event has no `customerId` in metadata — can't match to internal user.
**Why it happens:** Top-level `session.metadata` stays with the CheckoutSession object only. It does not copy to the created Subscription.
**How to avoid:** Use `subscription_data.metadata` when creating the checkout session. Verify by checking `subscription.metadata` in test webhook events before shipping.
**Warning signs:** `event.data.object.metadata` is empty `{}` on subscription events.

### Pitfall 3: Stripe Client Instantiation Timing
**What goes wrong:** Build error or runtime crash: `"Missing required argument: apiKey"` even though `STRIPE_SECRET_KEY` is set.
**Why it happens:** `new Stripe(process.env.STRIPE_SECRET_KEY)` at module level runs during Next.js module evaluation before env is available, or in Edge runtime where env vars aren't injected the same way.
**How to avoid:** Use the lazy singleton pattern in `src/lib/stripe/client.ts`. Import the `getStripe()` function, call it only inside request handlers.
**Warning signs:** Error appears at build time or on first cold start, not during request handling.

### Pitfall 4: Apple Pay Testing Limitations
**What goes wrong:** Apple Pay button never appears during testing.
**Why it happens:** Stripe test cards cannot be saved to Apple Wallet. Apple Pay requires real card numbers even in test mode.
**How to avoid:** Test Apple Pay display by using a real Safari browser with a real card on a test Stripe account. Alternatively, verify the button displays (even if payment is blocked) using Stripe's test environment.
**Warning signs:** Apple Pay button missing only in test/dev, works in production.

### Pitfall 5: QR Scanner SSR Error
**What goes wrong:** `ReferenceError: navigator is not defined` during build or SSR.
**Why it happens:** QR scanner components access `navigator.mediaDevices` at module level or in component body, which doesn't exist in Node.js.
**How to avoid:** Always wrap the scanner component in `next/dynamic` with `{ ssr: false }`. Place it in a `'use client'` file.
**Warning signs:** Error appears at build time, not in browser console.

### Pitfall 6: Trusting Success URL for Membership Grant
**What goes wrong:** Customer navigates to `/membership/success?session_id=cs_xxx`, app grants membership before webhook fires.
**Why it happens:** Success URL fires immediately on redirect; webhook fires asynchronously. Race condition: user sees "success" but webhook hasn't updated DB yet.
**How to avoid:** On the success page, retrieve the session via `stripe.checkout.sessions.retrieve(session_id)` to confirm `status === 'complete'`. Membership access should be controlled by DB state set by webhook, not by URL param alone.

### Pitfall 7: Vercel Deployment Protection Blocking Webhooks
**What goes wrong:** Stripe webhook returns 401 or Vercel intercepts with auth challenge.
**Why it happens:** Vercel Preview deployments have optional "Deployment Protection" that requires auth on all routes.
**How to avoid:** Add the Stripe webhook URL to the deployment protection allowlist, or disable protection for the `/api/stripe/webhook` path in production.

---

## Code Examples

### Stripe Client Singleton
```typescript
// Source: Community best practice for Next.js + Stripe (verified across multiple 2025 guides)
// src/lib/stripe/client.ts
import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(key)
  }
  return _stripe
}
```

### Webhook Raw Body Pattern
```typescript
// Source: https://docs.stripe.com/webhooks/signature
// app/api/stripe/webhook/route.ts
export async function POST(request: NextRequest) {
  const body = await request.text() // RAW — do not use request.json()
  const sig = (await headers()).get('stripe-signature')!

  const event = getStripe().webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
  // ... handle event
}
```

### Checkout Session Creation (Subscription Mode)
```typescript
// Source: https://docs.stripe.com/payments/checkout/build-subscriptions
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: stripePriceId, quantity: 1 }],
  metadata: { internalCustomerId: customerId },       // for checkout.session.completed
  subscription_data: {
    metadata: { internalCustomerId: customerId },     // for customer.subscription.*
  },
  success_url: `${origin}/membership/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/membership`,
})
```

### QR Code Data URL Generation (Server-Side)
```typescript
// Source: https://github.com/soldair/node-qrcode
import QRCode from 'qrcode'
const dataUrl = await QRCode.toDataURL(tokenString, {
  errorCorrectionLevel: 'M',
  width: 300,
  margin: 2,
})
// Returns: "data:image/png;base64,..."
```

### QR Scanner Component (Client-Side with SSR Guard)
```typescript
// Source: verified pattern from https://www.npmjs.com/package/@yudiel/react-qr-scanner
// components/membership/QrScanner.tsx
'use client'
import dynamic from 'next/dynamic'

const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then(m => m.Scanner),
  { ssr: false }
)

export function MembershipScanner({ onScan }: { onScan: (data: string) => void }) {
  return (
    <Scanner
      onScan={(results) => {
        if (results.length > 0) onScan(results[0].rawValue)
      }}
      constraints={{ facingMode: 'environment' }} // rear camera on mobile
    />
  )
}
```

### Webhook Event Processing with Prisma Transaction
```typescript
// Source: Pattern from https://jonmeyers.io/blog/processing-payments-with-stripe-and-webhooks/
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const customerId = session.metadata?.internalCustomerId
  if (!customerId) throw new Error('No internalCustomerId in session metadata')

  const stripeCustomerId = session.customer as string
  const stripeSubscriptionId = session.subscription as string

  await prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: customerId },
      data: {
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionStatus: 'active',
      },
    })
    await tx.payment.create({
      data: {
        customerId,
        stripeSessionId: session.id,
        amount: session.amount_total ?? 0,
        currency: session.currency ?? 'jpy',
        status: 'succeeded',
      },
    })
  })
}
```

---

## Prisma Schema Additions

The following new models and fields are needed. None of the existing models need breaking changes.

```prisma
// Add to Customer model:
// stripeCustomerId   String?  @unique
// stripeSubscriptionId String? @unique
// subscriptionStatus  String?  // 'active' | 'past_due' | 'canceled' | null

model MembershipPlan {
  id             String       @id @default(uuid())
  name           String       // e.g., "月額会員" (Monthly Member)
  nameEn         String?
  description    String?
  priceJpy       Int          // Display price in yen
  stripePriceId  String       @unique // Stripe Price ID (price_xxx)
  stripeProductId String      // Stripe Product ID (prod_xxx)
  intervalType   String       // 'month' | 'year' | 'one_time'
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  memberships    Membership[]
}

model Membership {
  id                   String         @id @default(uuid())
  customerId           String
  customer             Customer       @relation(fields: [customerId], references: [id], onDelete: Cascade)
  planId               String
  plan                 MembershipPlan @relation(fields: [planId], references: [id])
  stripeSubscriptionId String?        // null for one-time purchases
  status               String         // 'active' | 'past_due' | 'canceled' | 'expired'
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  canceledAt           DateTime?
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt

  @@index([customerId])
  @@index([stripeSubscriptionId])
}

model Payment {
  id              String    @id @default(uuid())
  customerId      String
  customer        Customer  @relation(fields: [customerId], references: [id])
  stripeSessionId String?   @unique
  stripeInvoiceId String?   @unique
  amount          Int       // Amount in smallest currency unit (sen for JPY = 1 yen = 1)
  currency        String    @default("jpy")
  status          String    // 'succeeded' | 'failed' | 'pending'
  description     String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([customerId])
}

// Idempotency guard for webhook events
model StripeEvent {
  id            String   @id @default(uuid())
  stripeEventId String   @unique
  processedAt   DateTime @default(now())
}
```

**JPY Currency Note:** JPY is a zero-decimal currency in Stripe. Amounts are in yen (not sen). `amount_total` of `1000` = ¥1,000. Do not divide by 100 for display.

---

## Webhook Events to Handle

| Event | When It Fires | Action |
|-------|--------------|--------|
| `checkout.session.completed` | Customer completes checkout | Create `Membership`, record `Payment`, update `Customer.stripeCustomerId` |
| `customer.subscription.updated` | Plan change, renewal, status change | Update `Membership.status`, `currentPeriodEnd` |
| `customer.subscription.deleted` | Cancellation (immediate or period-end) | Set `Membership.status = 'canceled'`, `canceledAt` |
| `invoice.paid` | Renewal payment succeeds | Record `Payment`, extend `currentPeriodEnd` |
| `invoice.payment_failed` | Renewal payment fails | Set `Membership.status = 'past_due'`, notify customer |

**Minimum viable set:** Handle `checkout.session.completed` and `customer.subscription.updated`/`deleted` first. Add invoice events for payment history records.

---

## Apple Pay Integration

Apple Pay works automatically with Stripe hosted Checkout. No additional configuration required. The Stripe-hosted page shows Apple Pay when:
- Customer uses Safari on iOS/macOS with Apple Pay set up
- The Stripe account has Apple Pay enabled (on by default)

For Japan specifically: Stripe supports Apple Pay in Japan. Stripe handles the 3DS mandate (required in Japan from March 2025) automatically within hosted Checkout.

**Domain registration is required ONLY if using Payment Element (embedded checkout).** Using hosted Checkout avoids this entirely.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Payment Request Button Element` | `Express Checkout Element` | 2024 | Stripe now recommends Express Checkout Element over Payment Request Button for embedded flows |
| Pages Router `bodyParser: false` | App Router `await request.text()` | Next.js 13+ | Different raw body access pattern |
| Stripe API `2024-09-30.acacia` | `2026-01-28.clover` (pinned in stripe v20) | Jan 2026 | stripe v20 pins to this version automatically |
| Setting `metadata` on CheckoutSession | Setting `subscription_data.metadata` | Always been true | Common misconception clarified — top-level metadata does not propagate to subscriptions |

**Deprecated/outdated:**
- `next-qrcode` v2.5.1: Published 2 years ago, not maintained. Use `qrcode` or `react-qr-code`.
- `react-qr-reader` v3.0.0-beta-1: Published 4 years ago, abandoned. Use `@yudiel/react-qr-scanner`.
- Payment Request Button Element: Still works but Express Checkout Element is the migration target.

---

## Open Questions

1. **Membership plan data source: Stripe Products or DB?**
   - What we know: Plans can be created in Stripe Dashboard and referenced by price ID in DB, OR created programmatically via API.
   - What's unclear: Whether admin should create plans in Stripe Dashboard or via app UI that calls Stripe API to create products.
   - Recommendation: Create plans via admin UI that calls `stripe.products.create()` + `stripe.prices.create()` and stores `stripePriceId` in `MembershipPlan`. This keeps Stripe as the source of truth for pricing while the DB stores display data.

2. **QR code refresh strategy**
   - What we know: Short-lived JWTs prevent screenshot sharing. 24h is a reasonable window for a customer to arrive for their appointment.
   - What's unclear: Should QR codes regenerate on each page load (stateless) or be cached/stored?
   - Recommendation: Stateless generation — generate a fresh 24h JWT signed from `customerId` on each request to `/api/membership/qr`. No storage needed. Customer refreshes page if QR expires mid-session.

3. **One-time ticket packs (回数券) vs subscriptions**
   - What we know: BIZF-01 (multi-session tickets) is a v2 requirement. Phase 4 is planned for it. Phase 3 is subscription memberships.
   - What's unclear: Whether ticket packs should use `mode: 'payment'` + `ticketBalance` (already on Customer model) in Phase 3 or strictly Phase 4.
   - Recommendation: Defer ticket packs to Phase 4 per roadmap. Phase 3 implements `mode: 'subscription'` memberships only. The `ticketBalance` field already exists on `Customer` for Phase 4.

4. **Stripe Customer Portal**
   - What we know: Stripe offers a hosted Customer Portal for subscription management (cancel, update payment method).
   - What's unclear: Whether this project wants customer self-service cancellation in Phase 3.
   - Recommendation: Include `stripe.billingPortal.sessions.create()` as a simple "Manage Subscription" link from the customer account page. It's a 5-line integration and prevents needing to build a cancellation flow.

---

## Sources

### Primary (HIGH confidence)
- Stripe Official Docs — https://docs.stripe.com/webhooks/signature — raw body requirement verified
- Stripe Official Docs — https://docs.stripe.com/metadata/use-cases — `subscription_data.metadata` propagation confirmed
- Stripe Official Docs — https://docs.stripe.com/apple-pay — hosted Checkout requires no additional Apple Pay config
- Stripe Official Docs — https://docs.stripe.com/billing/subscriptions/webhooks — subscription event list
- npmjs.com — stripe package v20.3.1 current as of Feb 2026, API version `2026-01-28.clover`
- GitHub — soldair/node-qrcode — server-side QR generation API (Node.js, async/await)

### Secondary (MEDIUM confidence)
- Pedro Alonso (2025 guide) — https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/ — Server Actions checkout pattern, Prisma fields
- HookRelay guide — https://www.hookrelay.io/guides/nextjs-webhook-stripe — idempotency and retry patterns
- GitHub BastidaNicolas/nextauth-prisma-stripe — `stripeCustomerId` field pattern on user model
- Stripe Japan newsroom (2025) — 3DS mandate in Japan handled by Stripe Checkout automatically

### Tertiary (LOW confidence)
- `@yudiel/react-qr-scanner` for staff scan — recommended based on search results showing it's maintained and handles React SSR; needs validation in Next.js 15 App Router at implementation time.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Stripe SDK v20 current, `qrcode` verified server-side capable, `jose` already in project
- Architecture: HIGH — Extends existing service/validation/API route patterns; webhook patterns verified against official docs
- Pitfalls: HIGH — All critical pitfalls (raw body, metadata propagation, lazy init) verified against official Stripe docs and community issues
- QR scanner library: MEDIUM — `@yudiel/react-qr-scanner` is community-recommended but not tested against this specific project setup

**Research date:** 2026-02-20
**Valid until:** 2026-03-22 (Stripe SDK updates frequently; verify latest version before installing)
