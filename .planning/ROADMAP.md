# Roadmap: SYNQ

## Overview

SYNQ delivers a wellness booking system with double-bottleneck scheduling logic for Japanese markets. Phase 1 is the MVP with complete booking flow, Phase 2 adds CRM and reporting for parity with current systems, and Phase 3 delivers the differentiation features from the product mindmap.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: MVP** - Foundation, user booking, admin management, tests, email (complete booking system)
- [ ] **Phase 01.1: Post-MVP UI Enhancements (Inserted)** - Prototype calendar, data table, updated types/exports
- [ ] **Phase 2: Parity** - CRM, customer management, employee KPIs, sales reporting
- [ ] **Phase 3: Payments & Membership** - Stripe/Apple Pay checkout, membership plans, QR codes, user & admin payment pages
- [ ] **Phase 4: Differentiation** - Multi-session tickets, loyalty tiers, dynamic pricing, customer app (mindmap vision)

## Phase Details

### Phase 1: MVP
**Goal**: Complete booking system with user registration, calendar booking with double-bottleneck logic, admin management, and email confirmations
**Depends on**: Nothing (first phase)
**Requirements**:
- Infrastructure: INFR-01, INFR-02, INFR-03, INFR-04, INFR-05, INFR-06, INFR-07
- Architecture: ARCH-01, ARCH-02, ARCH-03, ARCH-04
- Security: SECR-01, SECR-02, SECR-03, SECR-04, SECR-05, SECR-06
- Components: COMP-01, COMP-02, COMP-03
- User: UREG-01, UREG-02, UREG-03
- Booking: BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, BOOK-06, BOOK-07
- Admin: ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06, ADMN-07, ADMN-08
- Testing: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06

**Success Criteria** (what must be TRUE):
  1. Database schema exists with all models and proper indexes
  2. RLS policies enabled, input validation with Zod, admin routes protected
  3. User can register (email/name/phone) and proceed to booking
  4. User can view single-day timeline calendar with all workers
  5. Available slots respect double-bottleneck logic (worker free AND bed available)
  6. User can book an available slot and see confirmation
  7. User receives email confirmation with booking details
  8. Admin can log in and view calendar with booking details
  9. Admin can block time, cancel/edit bookings
  10. Admin can CRUD workers, services, and resources
  11. All booking/availability logic covered by unit and integration tests
  12. Concurrent booking attempts handled correctly

**Plans:** 14 plans in 7 waves

Plans:
- [x] 01-01-PLAN.md — Database schema and seed data (Wave 1)
- [x] 01-02-PLAN.md — Project structure and i18n setup (Wave 1)
- [x] 01-03-PLAN.md — Component library foundation (Wave 1)
- [x] 01-04-PLAN.md — Availability service with TDD (Wave 2)
- [x] 01-05-PLAN.md — Booking service with TDD (Wave 2)
- [x] 01-06-PLAN.md — Calendar timeline component (Wave 3)
- [x] 01-07-PLAN.md — User registration and booking flow (Wave 3)
- [x] 01-08-PLAN.md — Email integration with Resend (Wave 3)
- [x] 01-09-PLAN.md — Admin authentication and dashboard (Wave 4)
- [x] 01-10-PLAN.md — Admin CRUD operations (Wave 4)
- [x] 01-11-PLAN.md — Security hardening (RLS, rate limiting) (Wave 5)
- [x] 01-12-PLAN.md — SWR polling and test finalization (Wave 5)
- [x] 01-13-PLAN.md — Service-aware booking flow (TICKET 01-06) (Wave 6)
- [x] 01-14-PLAN.md — Frontend refactor with EmployeeTimeline (Wave 7)

### Phase 01.1: Post-MVP UI enhancements: prototype calendar, data table, updated types and exports (INSERTED)

**Goal:** Stabilize calendar prototype UI architecture in Storybook and polish parity against reference mockups
**Depends on:** Phase 1
**Plans:** 1 plan

Plans:
- [ ] 01.1-01-PLAN.md — Prototype calendar componentization + drag/layout parity polish (Wave 1)

### Phase 2: Parity
**Goal**: CRM and reporting features that achieve parity with current spreadsheet-based workflow
**Depends on**: Phase 1
**Requirements**: CRM-01, CRM-02, CRM-03, CRM-04, CRM-05, CRM-06, KPI-01, KPI-02, KPI-03, KPI-04, KPI-05, KPI-06, INFR-08

**Success Criteria** (what must be TRUE):
  1. Admin can view customer list with search/filter
  2. Admin can view individual customer profile with booking history
  3. Admin can add/edit notes on customer records
  4. Admin can upload and view customer intake forms (PDF/image)
  5. Customer visit count and last visit date tracked automatically
  6. Admin can view total revenue (daily, weekly, monthly)
  7. Admin can view revenue and booking counts by worker
  8. Admin can view worker rankings
  9. Admin can view repeat customer rate
  10. Admin can export reports as CSV

**Plans:** 8 plans in 4 waves

Plans:
- [x] 02-01-PLAN.md — Atomic CRM schema: customer ownership + metrics fields (Wave 1)
- [x] 02-02-PLAN.md — Customer list with search, filter, pagination (Wave 2)
- [x] 02-05-PLAN.md — Sales reporting dashboard (revenue + worker metrics) (Wave 2)
- [x] 02-03-PLAN.md — Customer detail with booking history and notes (Wave 3)
- [x] 02-04-PLAN.md — Intake form upload (Supabase Storage) (Wave 3)
- [x] 02-06-PLAN.md — Worker rankings and repeat customer rate (Wave 3)
- [x] 02-07-PLAN.md — CSV export (customers, bookings, revenue) (Wave 4)
- [x] 02-08-PLAN.md — Integration, i18n, and end-to-end verification (Wave 4)

### Phase 3: Payments & Membership
**Goal**: Stripe/Apple Pay checkout, membership plans with QR codes for in-location scanning, user-facing payment pages, admin payment management, backend schema and webhook integration
**Depends on**: Phase 2
**Requirements**: PAY-01 (Stripe checkout), PAY-02 (Apple Pay), PAY-03 (webhooks), MEM-01 (membership plans), MEM-02 (QR codes), MEM-03 (QR scan verification), MEM-04 (admin plan management), MEM-05 (admin payment views)

**Success Criteria** (what must be TRUE):
  1. Customer can purchase membership plans via Stripe checkout
  2. Apple Pay supported as payment method
  3. Customer has QR code in their account for in-location scanning
  4. Staff can scan QR code to verify membership and process visit
  5. Admin can view and manage membership plans (create, edit, deactivate)
  6. Admin can view payment history and membership status per customer
  7. Stripe webhooks correctly update payment and subscription status
  8. Checkout flow handles success, failure, and cancellation gracefully

**Plans:** 6 plans in 4 waves

Plans:
- [ ] 03-01-PLAN.md — Foundation: schema, packages, Stripe client, validations (Wave 1)
- [ ] 03-02-PLAN.md — Webhook handler and payment/membership services (Wave 2)
- [ ] 03-03-PLAN.md — Admin membership plan management (Wave 2)
- [ ] 03-04-PLAN.md — Customer checkout flow with Stripe hosted checkout (Wave 3)
- [ ] 03-05-PLAN.md — QR code generation, verification, and staff scanner (Wave 3)
- [ ] 03-06-PLAN.md — Admin payment views, navigation, i18n, and end-to-end verification (Wave 4)

### Phase 4: Differentiation
**Goal**: Deliver full mindmap vision with loyalty program, dynamic pricing, and customer app features
**Depends on**: Phase 3
**Requirements**: (from mindmap - to be detailed when Phase 3 completes)

**Success Criteria** (what must be TRUE):
  1. Customer can purchase and use multi-session tickets (回数券)
  2. Customer loyalty tiers work (Bronze -> Silver -> Gold -> Platinum -> Diamond)
  3. Higher tiers get booking priority and discounts
  4. Dynamic pricing adjusts based on time/demand
  5. Customer app shows remaining sessions, next appointment, booking history
  6. QR code check-in automatically deducts session from ticket
  7. Accounting software integration exports data (CSV/API)

Plans:
- [ ] TBD (to be planned)

## Progress

**Execution Order:**
Current priority order: 1 -> 2 -> 3 -> 01.1 -> 4 (01.1 temporarily deferred)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. MVP | 14/14 | Complete | 2026-02-05 |
| 01.1 Post-MVP UI Enhancements | 0/1 | Deferred | - |
| 2. Parity | 8/8 | Complete | 2026-02-19 |
| 3. Payments & Membership | 0/6 | Planned | - |
| 4. Differentiation | 0/? | Not started | - |
