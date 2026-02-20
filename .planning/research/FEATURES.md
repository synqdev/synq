# Feature Landscape

**Domain:** Wellness booking systems (massage, seitai, yoga studios)
**Researched:** 2026-02-04
**Confidence:** MEDIUM (based on training data, WebSearch unavailable for 2026 verification)

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Online booking calendar | Core function - customers book without calling | Medium | Must handle conflicts, show availability in real-time |
| Email/SMS confirmations | Reduces no-shows, sets customer expectations | Low | Automated messages on booking/cancellation |
| Appointment cancellation | Customers need flexibility | Low | Must respect cancellation policies (e.g. 24h notice) |
| Service menu with duration & pricing | Customers need to know what they're booking | Low | List of treatments with clear timing/cost |
| Calendar view for staff | Staff need to see their schedule | Medium | Daily/weekly/monthly views, mobile-friendly |
| Customer contact info capture | Business needs to reach customers | Low | Name, email, phone minimum |
| Booking history | Customers/staff need to see past appointments | Low | List of previous bookings with dates |
| Timezone handling | Prevents booking confusion | Medium | Critical for Japan (JST) consistency |
| Mobile-responsive booking | Most bookings happen on phones | Medium | Touch-friendly, fast loading |
| No-show/cancellation tracking | Businesses need to identify problem customers | Low | Flag patterns of no-shows |
| Waitlist management | Capture demand when fully booked | Medium | Notify when slots open up |
| Multi-service booking | Customer books multiple treatments in one session | Medium | Calculate combined duration, pricing |

### Japan-Specific Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| LINE notification integration | LINE is dominant in Japan for business comms | Medium | Reminders, confirmations via LINE |
| Polite Japanese language | Customers expect keigo (polite language) | Low | All messaging in appropriate formality |
| Cash payment option | Japan still heavily cash-based | Low | Track "pay at venue" vs prepaid |
| Same-day booking | Common in Japan wellness industry | Low | Allow bookings up to current time slot |
| Staff designation | Customers often have favorite practitioners | Medium | "Request specific staff" or "any available" |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Multi-session tickets (回数券) | Common in Japanese wellness - buy 5 sessions, use over time | High | Complex state tracking, partial usage, expiry |
| Customer loyalty tiers | Reward regular customers, increase retention | High | Bronze→Silver→Gold→Diamond with benefits |
| Dynamic pricing | Off-peak discounts, surge pricing for popular slots | Medium | Incentivize booking behavior |
| QR code check-in | Contactless arrival, reduces front-desk friction | Low | Generate codes, scan to mark arrival |
| Customer progress tracking | Visual progress (weight, flexibility, goals) | High | Charting, photo uploads, measurements over time |
| Automated reminders with preferences | Customer chooses reminder timing (24h/2h/none) | Medium | Configurable per customer |
| Resource double-booking prevention | Prevents booking same massage table twice | High | Already in Phase 1 scope - competitive advantage |
| Package deals | Bundle multiple services at discount | Medium | Create packages, track which items used |
| Gift vouchers | Customer buys session for someone else | Medium | Unique codes, redemption tracking |
| Integration with POS | Link bookings to payment/inventory systems | High | Requires external system APIs |
| Blocked time slots | Admin blocks time for breaks, training, etc. | Medium | Already in Phase 1 scope |
| Customer notes/preferences | Staff see "prefers firm pressure" or "allergic to lavender" | Low | Free-text notes, tag system |
| Recurring bookings | Book every Tuesday at 3pm for 8 weeks | Medium | Series management, bulk cancellation |
| Google Calendar sync | Staff sync bookings to personal calendar | Medium | OAuth, bidirectional sync complexity |
| Online payment collection | Reduce no-shows via upfront payment | High | Payment gateway integration, PCI compliance |

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Complex custom booking rules per service | Creates cognitive overload for users | Use simple, consistent rules across all services. Add special case handling only when proven necessary. |
| Social features (reviews, ratings in-app) | Creates conflict in small wellness businesses | These are personal services - negative reviews damage relationships. Keep feedback private between customer and business. |
| Marketplace/multi-vendor platform (MVP) | Adds complexity before validating single-vendor model | Focus on one business managing their bookings first. Multi-vendor is a different business model. |
| Overbooking/overselling slots | Wellness services can't oversell like airlines | Hard block conflicts. Better to have waitlist than double-book. |
| Free-form text time slots | Creates parsing nightmares | Use structured time pickers only. |
| Customer self-service profile editing of history | Allows fraud/disputes | Customers can edit future bookings and preferences, but not past appointment records. |
| Automated upselling during booking | Feels pushy in wellness context | Let business manually suggest add-ons. Wellness is about trust, not conversion optimization. |
| Public availability API | Scraping, bot bookings, competitive intelligence | Keep booking interface authenticated or rate-limited. |
| Gamification (badges, streaks) | Wrong tone for wellness/therapeutic services | Progress tracking yes, but not "achievement unlocked" style features. |

## Feature Dependencies

```text
Basic booking flow (required first):
  User registration
    → Email verification
      → Profile management
        → Booking calendar
          → Service selection
            → Time slot selection
              → Confirmation

Admin management (required first):
  Admin authentication
    → Service CRUD
      → Staff CRUD
        → Resource CRUD
          → Calendar management
            → Appointment management

Enhanced features (build after basic flow):
  Booking confirmation
    → Notification system
      → Email notifications
        → LINE notifications (Japan-specific)

  Basic booking
    → Cancellation system
      → Cancellation policies (24h notice, etc.)
        → Waitlist notification

  Customer tracking
    → Booking history
      → Multi-session tickets
        → Loyalty tiers
          → Dynamic pricing

  Resource management
    → Double-booking prevention (Phase 1)
      → Recurring bookings
        → Blocked time slots (Phase 1)

  Payment tracking
    → Payment status (cash/paid/pending)
      → Online payment integration
        → Package deals
          → Gift vouchers
```

## MVP Recommendation

For MVP (Phase 1 scope appears well-chosen), prioritize:

### Already in Phase 1 Scope (Good choices)
1. User registration with email verification - TABLE STAKES
2. Calendar booking with double-bottleneck logic (worker + resource) - DIFFERENTIATOR
3. Admin calendar view with time blocking - TABLE STAKES + DIFFERENTIATOR
4. Appointment management - TABLE STAKES

### Add to Phase 1 (Critical table stakes missing)
1. **Email confirmations** - Customers expect confirmation immediately after booking (Complexity: Low)
2. **Service menu management** - Admin must define what services are bookable (Complexity: Low)
3. **Basic cancellation** - Customers must be able to cancel (Complexity: Low)

### Defer to Phase 2
- LINE notification integration (Medium complexity, requires external service setup)
- Customer booking history view (Low complexity, nice-to-have)
- Staff designation preference (Medium complexity, can start with "any available")
- Cancellation policies (Medium complexity, can start with "always allowed")

### Defer to Phase 3+
- Multi-session tickets (回数券) - High complexity, requires payment/ticket state management
- Loyalty tiers - High complexity, requires extensive tracking
- Dynamic pricing - Medium complexity, requires pricing engine
- QR code check-in - Low complexity but non-essential
- Progress tracking - High complexity, large feature set
- Online payment integration - High complexity, external dependencies

## Japan-Specific Considerations

### Critical for Japanese Market
1. **LINE integration** - Not optional long-term. 90%+ of Japanese use LINE for business communication.
2. **Polite language (keigo)** - All customer-facing text must use appropriate formality levels.
3. **Mobile-first design** - Japanese users primarily book from smartphones.
4. **Same-day booking** - Common in wellness industry, unlike restaurants that may require advance booking.
5. **Staff preference** - Customers build relationships with specific practitioners.

### Cultural Patterns
- **回数券 (multi-session tickets)** - Expected in massage/yoga/beauty services. Customers buy bulk sessions at discount.
- **Cash payments** - Still dominant despite growing digital payment adoption.
- **Reservation = commitment** - No-shows are culturally frowned upon, but cancellation policies still needed.
- **Privacy concerns** - Keep customer data minimal, don't require social media login.

## Feature Prioritization Matrix

| Feature | User Impact | Business Impact | Complexity | Priority |
|---------|-------------|-----------------|------------|----------|
| Email confirmations | High | High | Low | P0 (add to Phase 1) |
| Service menu CRUD | High | High | Low | P0 (add to Phase 1) |
| Basic cancellation | High | Medium | Low | P0 (add to Phase 1) |
| LINE notifications | High | High | Medium | P1 (Phase 2) |
| Booking history | Medium | Low | Low | P1 (Phase 2) |
| Staff designation | Medium | Medium | Medium | P1 (Phase 2) |
| Multi-session tickets | High | High | High | P2 (Phase 3) |
| Loyalty tiers | Medium | High | High | P2 (Phase 3) |
| QR check-in | Low | Medium | Low | P2 (Phase 3) |
| Dynamic pricing | Medium | High | Medium | P3 (Phase 4+) |
| Progress tracking | High | Medium | High | P3 (Phase 4+) |
| Online payments | High | High | High | P3 (Phase 4+) |

## Competitive Feature Analysis

**Confidence: LOW** - Unable to verify current competitor features without WebSearch.

Based on training data (pre-2025), common wellness booking platforms include:
- Mindbody (US-based, feature-rich, expensive)
- Acuity Scheduling (simple, US-focused)
- Square Appointments (integrated with POS)
- Fresha (UK-based, freemium)
- Japanese local players (limited information)

**Known gaps in market:**
- Few platforms handle Japanese business practices well (回数券, LINE integration)
- Most are designed for US/European markets
- Complex pricing for small businesses
- Heavy features that small studios don't need

**SYNQ opportunity:**
- Japanese-first design (LINE, keigo, cultural patterns)
- Affordable for small wellness businesses
- Resource double-booking prevention (many platforms don't handle this well)
- Focus on simplicity over feature bloat

## Sources

**Note:** Research conducted with WebSearch unavailable. Findings based on:
- Training data knowledge of wellness booking domain (pre-2025)
- General SaaS booking system patterns
- Japanese business culture knowledge
- PROJECT.md context for SYNQ

**Confidence levels:**
- Table stakes features: MEDIUM (well-established patterns, but not verified for 2026)
- Japan-specific features: MEDIUM (cultural knowledge stable, but technical landscape may have changed)
- Competitive analysis: LOW (unable to verify current market state)
- Feature complexity estimates: MEDIUM (based on general software development experience)

**Recommended verification:**
- Survey Japanese wellness business owners for current pain points
- Audit competitor features (Mindbody, Acuity, Japanese alternatives)
- Validate LINE API capabilities and integration complexity
- Confirm customer expectations through user interviews
