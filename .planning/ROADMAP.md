# Roadmap: SYNQ

## Overview

SYNQ delivers a wellness booking system with double-bottleneck scheduling logic for Japanese markets. Phase 1 is the MVP with complete booking flow, Phase 2 adds CRM and reporting for parity with current systems. v2.0 (Phases 3-7) adds AI-powered electronic medical records (Karte). Phases 8-9 deliver payments and differentiation.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: MVP** - Foundation, user booking, admin management, tests, email (complete booking system)
- [ ] **Phase 01.1: Post-MVP UI Enhancements (Inserted)** - Prototype calendar, data table, updated types/exports
- [x] **Phase 2: Parity** - CRM, customer management, employee KPIs, sales reporting
- [x] **Phase 2.1: Staff Availability (INSERTED)** - Staff self-service page to set working hours by day of week
- [ ] **Phase 3: Karte Foundation** - Schema (karute_records, karute_entries, recording_sessions, transcription_segments), storage bucket, API layer
- [ ] **Phase 4: Recording & Transcription** - In-browser audio recording with timer/waveform, upload to storage, Whisper transcription
- [ ] **Phase 5: AI Classification & Karute UI** - AI classifies transcript into karute entries, karute view/edit UI, approval workflow
- [ ] **Phase 6: Ask AI Chat** - Chat interface to query karute/customer data, streaming OpenAI responses
- [ ] **Phase 7: Appointment View & Dashboard** - Per-appointment page, dashboard with today's appointments, sidebar navigation
- [ ] **Phase 8: Payments & Membership** - Stripe/Apple Pay checkout, membership plans, QR codes, user & admin payment pages
- [ ] **Phase 9: Differentiation** - Multi-session tickets, loyalty tiers, dynamic pricing, customer app (mindmap vision)

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

### Phase 2.1: Staff Availability (INSERTED)

**Goal**: Staff self-service page where each worker can view and edit their own working hours by day of week, using the existing WorkerSchedule model
**Depends on**: Phase 2
**Requirements**: STAFF-01 (staff availability page), STAFF-02 (day-of-week hour editing)

**Success Criteria** (what must be TRUE):
  1. Staff can view their current weekly schedule (hours per day)
  2. Staff can edit their working hours for each day of the week
  3. Changes persist to WorkerSchedule table
  4. Availability changes reflected in booking system (existing slot logic)
  5. Page accessible with staff authentication

**Plans:** 2 plans in 2 waves

Plans:
- [x] 02.1-01-PLAN.md — Validation schema, server action, and i18n translations (Wave 1)
- [x] 02.1-02-PLAN.md — Schedule editor UI page and workers table navigation (Wave 2)

### Phase 3: Karte Foundation
**Goal**: Database schema for karute system (karute_records, karute_entries, recording_sessions, transcription_segments), Supabase Storage bucket for audio recordings, and API/service layer for CRUD operations
**Depends on**: Phase 2.1 (needs existing customer/worker models)
**Branch**: `phase-3/karte-foundation`
**Reference**: [liampwww/synq-karute](https://github.com/liampwww/synq-karute) — owner's prototype

**Success Criteria** (what must be TRUE):
  1. Karute-related tables exist with proper indexes and RLS policies
  2. Supabase Storage bucket configured for audio recordings
  3. Service layer for karute CRUD operations
  4. API endpoints for karute records and entries
  5. Integration with existing Customer model

**Plans:** 3 plans in 3 waves

Plans:
- [ ] 03-01-PLAN.md — Prisma schema, RLS policies, storage bucket, recording-storage module (Wave 1)
- [ ] 03-02-PLAN.md — Zod validation schemas, karute service, recording service (Wave 2)
- [ ] 03-03-PLAN.md — Server actions, audio upload API route, unit tests (Wave 3)

### Phase 4: Recording & Transcription
**Goal**: In-browser audio recording with timer and waveform visualization, audio upload to Supabase Storage, OpenAI Whisper transcription with segment storage
**Depends on**: Phase 3
**Branch**: `phase-4/recording-transcription`

**Success Criteria** (what must be TRUE):
  1. Staff can record audio in-browser with start/pause/stop controls
  2. Timer and waveform visualization during recording
  3. Audio uploaded to Supabase Storage bucket
  4. Whisper API transcribes audio to Japanese text segments
  5. Transcription segments stored with timestamps and speaker labels

**Plans:** 3 plans in 2 waves

Plans:
- [ ] 04-01-PLAN.md — useAudioRecorder hook and MIME utility with tests (Wave 1)
- [ ] 04-02-PLAN.md — Transcription service, API route, and tests (Wave 1)
- [ ] 04-03-PLAN.md — Recording UI components, pipeline wiring, and i18n (Wave 2)

### Phase 5: AI Classification & Karute UI
**Goal**: AI classifies transcription into structured karute entries (symptom, treatment, preference, lifestyle, etc.), karute view/edit UI with approval workflow (draft → review → approved)
**Depends on**: Phase 4
**Branch**: `phase-5/ai-classification-karute-ui`

**Success Criteria** (what must be TRUE):
  1. AI classifies transcript into karute entry categories with confidence scores
  2. AI generates summary for each karute record
  3. Staff can view, edit, add, and delete karute entries
  4. Approval workflow: draft → review → approved
  5. Karute export as formatted text
  6. Per-customer karute history view

Plans:
- [ ] TBD (to be planned)

### Phase 6: Ask AI Chat
**Goal**: Chat interface where staff can ask questions about customers and their karute history, with streaming AI responses powered by OpenAI, supporting customer-scoped and global query modes
**Depends on**: Phase 5
**Branch**: `phase-6/ask-ai-chat`

**Success Criteria** (what must be TRUE):
  1. Staff can open AI chat interface
  2. Chat queries karute records and customer data as context
  3. Responses stream in real-time (SSE)
  4. Customer-scoped mode: ask about a specific customer's history
  5. Global mode: ask across all recent karute records
  6. Japanese-first responses

**Plans:** 3 plans in 3 waves

Plans:
- [ ] 06-01-PLAN.md — Chat backend: schema, service, and API routes (Wave 1)
- [ ] 06-02-PLAN.md — Chat UI: slide-over panel, components, and i18n (Wave 2)
- [ ] 06-03-PLAN.md — Customer detail integration and end-to-end verification (Wave 3)

### Phase 7: Appointment View & Dashboard Integration
**Goal**: Per-appointment page at `/{locale}/appointment/{id}` with recording, karute, and settings access. Dashboard integration showing today's appointments with karute access. Dark navy sidebar navigation for appointment-level interface
**Depends on**: Phase 6
**Branch**: `phase-7/appointment-view-dashboard`

**Success Criteria** (what must be TRUE):
  1. Appointment page at `/{locale}/appointment/{id}` with tabbed interface
  2. Dashboard shows today's appointments with quick karute access
  3. Dark navy sidebar navigation for appointment context
  4. Full i18n (en/ja) for all new pages
  5. Settings page for AI provider config and business type templates

Plans:
- [ ] TBD (to be planned)

### Phase 8: Payments & Membership
**Goal**: Prepaid session packs with Stripe one-time checkout, QR code redemption for in-location scanning, user-facing payment pages, admin payment management, backend schema and webhook integration
**Depends on**: Phase 2
**Branch**: `phase-8/payments-membership`

**Success Criteria** (what must be TRUE):
  1. Customer can purchase prepaid session packs via Stripe one-time checkout
  2. Apple Pay supported as payment method (automatic via Stripe hosted checkout)
  3. Customer has QR code in their account for in-location scanning
  4. Staff can scan QR code to redeem one session and see remaining count
  5. Admin can view and manage session pack plans (create, edit, deactivate)
  6. Admin can view payment history and session balance per customer
  7. Stripe webhook correctly processes checkout.session.completed (one-time payment)
  8. Checkout flow handles success, failure, and cancellation gracefully

Plans:
- [ ] TBD (to be planned)

### Phase 9: Differentiation
**Goal**: Deliver full mindmap vision with loyalty program, dynamic pricing, and customer app features
**Depends on**: Phase 8

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
- v1.0: 1 → 2 → 2.1 (complete)
- v2.0: 3 → 4 → 5 → 6 → 7 (SYNQ Karte)
- Deferred: 01.1, 8, 9

**Branching Strategy (v2.0+):**
- Each phase gets an integration branch off `main`
- Each task = PR into the phase integration branch
- Integration branch merged to `main` by user/orchestrator when phase complete

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. MVP | 14/14 | Complete | 2026-02-05 |
| 01.1 Post-MVP UI Enhancements | 0/1 | Deferred | - |
| 2. Parity | 8/8 | Complete | 2026-02-25 |
| 2.1 Staff Availability | 2/2 | Complete | 2026-02-26 |
| 3. Karte Foundation | 0/3 | Not started | - |
| 4. Recording & Transcription | 0/3 | Not started | - |
| 5. AI Classification & Karute UI | 0/? | Not started | - |
| 6. Ask AI Chat | 0/3 | Not started | - |
| 7. Appointment View & Dashboard | 0/? | Not started | - |
| 8. Payments & Membership | 0/? | Deferred | - |
| 9. Differentiation | 0/? | Deferred | - |
