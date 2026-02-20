# Requirements: SYNQ

**Defined:** 2026-02-04
**Core Value:** A slot is only bookable when BOTH the worker is free AND a physical resource (bed) is available.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### User Registration

- [ ] **UREG-01**: User can enter email, name, and phone number
- [ ] **UREG-02**: User account is created and saved to database
- [ ] **UREG-03**: User proceeds to booking calendar after registration

### Booking Flow

- [ ] **BOOK-01**: User can view single-day timeline calendar
- [ ] **BOOK-02**: Calendar shows all workers as horizontal rows
- [ ] **BOOK-03**: Time slots show available (light) vs booked (dark)
- [ ] **BOOK-04**: Available slots respect double-bottleneck logic (worker free AND bed available)
- [ ] **BOOK-05**: User can select an available time slot
- [ ] **BOOK-06**: User sees confirmation page after booking
- [ ] **BOOK-07**: User receives email confirmation with booking details

### Admin

- [ ] **ADMN-01**: Admin can log in with credentials (admin/123 for v1)
- [ ] **ADMN-02**: Admin can view calendar with booking details (customer name, service)
- [ ] **ADMN-03**: Admin can block time slots for specific workers
- [ ] **ADMN-04**: Admin can cancel bookings
- [ ] **ADMN-05**: Admin can edit booking details
- [ ] **ADMN-06**: Admin can create/edit/delete workers
- [ ] **ADMN-07**: Admin can create/edit/delete services
- [ ] **ADMN-08**: Admin can create/edit/delete resources (beds)

### Components

- [ ] **COMP-01**: Shared component library structure
- [ ] **COMP-02**: Reusable calendar timeline component (used by both user and admin views)
- [ ] **COMP-03**: Calendar component supports read-only mode (user) and interactive mode (admin)

### Testing

- [ ] **TEST-01**: Unit tests for availability calculation logic
- [ ] **TEST-02**: Unit tests for double-bottleneck constraint (worker + resource)
- [ ] **TEST-03**: Unit tests for time slot overlap detection
- [ ] **TEST-04**: Integration tests for booking creation endpoint
- [ ] **TEST-05**: Integration tests for availability query endpoint
- [ ] **TEST-06**: Integration test for concurrent booking prevention (race conditions)

### Architecture

- [ ] **ARCH-01**: Separate business logic layer from API endpoints (service/domain layer)
- [ ] **ARCH-02**: Break availability logic into small, testable pure functions
- [ ] **ARCH-03**: Break booking logic into small, testable pure functions
- [ ] **ARCH-04**: API routes/actions call service layer, don't contain business logic

### Security

- [ ] **SECR-01**: Row-Level Security (RLS) enabled on all Supabase tables
- [ ] **SECR-02**: Input validation with Zod on all API endpoints
- [ ] **SECR-03**: Admin routes protected by auth middleware
- [ ] **SECR-04**: Environment variables for all secrets (no hardcoded credentials in code)
- [ ] **SECR-05**: Rate limiting on booking endpoint (prevent abuse)
- [ ] **SECR-06**: Parameterized queries only (Prisma handles this, but verify)

### CRM & Customer Management

- [ ] **CRM-01**: Admin can view customer list with search/filter
- [ ] **CRM-02**: Admin can view individual customer profile (contact info, notes)
- [ ] **CRM-03**: Admin can view customer booking history
- [ ] **CRM-04**: Admin can add/edit notes on customer records
- [ ] **CRM-05**: Customer intake form upload and storage (PDF/image)
- [ ] **CRM-06**: Track customer visit count and last visit date

### Employee KPIs & Reporting

- [ ] **KPI-01**: View total revenue (daily, weekly, monthly)
- [ ] **KPI-02**: View revenue by worker
- [ ] **KPI-03**: View booking count by worker
- [ ] **KPI-04**: View worker rankings (by revenue, by bookings)
- [ ] **KPI-05**: View repeat customer rate
- [ ] **KPI-06**: Export reports as CSV

### Infrastructure

- [ ] **INFR-01**: Database schema (Worker, Service, Resource, Customer, Booking, WorkerSchedule)
- [ ] **INFR-02**: Seed data (workers, 1 service @ 60 min, beds)
- [ ] **INFR-03**: i18n support with Japanese and English locales
- [ ] **INFR-04**: Serializable transactions for booking creation (prevent double-booking)
- [ ] **INFR-05**: Email service integration (Resend)
- [ ] **INFR-06**: Jest test setup
- [ ] **INFR-07**: SWR polling for calendar updates (5-10s interval)
- [ ] **INFR-08**: File storage for intake forms (Supabase Storage)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Authentication

- **AUTH-01**: Email verification code before account creation
- **AUTH-02**: SMS verification option

### Customer Features

- **CUST-01**: Customer can cancel their own bookings
- **CUST-02**: Customer can view booking history
- **CUST-03**: Customer can request specific worker

### Notifications

- **NOTF-01**: LINE notification integration
- **NOTF-02**: SMS reminders (24hr before appointment)
- **NOTF-03**: Booking reminder emails

### Business Features

- **BIZF-01**: Multi-session tickets (回数券)
- **BIZF-02**: Customer ranking/loyalty tiers
- **BIZF-03**: Dynamic pricing by time/worker
- **BIZF-04**: Online payment processing
- **BIZF-05**: Multiple service durations (30/60/90 min)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| SMS verification | Email sufficient for v1, add SMS in v2 |
| Customer self-cancellation | Admin-only for v1, simplifies flow |
| Multiple services | Single 60-min massage for v1 |
| Worker preferences | Show all workers, no filtering in v1 |
| Real-time WebSocket | SWR polling sufficient for v1 traffic |
| Hot Pepper integration | Unofficial API risk, defer indefinitely |
| Mobile app | Web-first, responsive design covers mobile |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| UREG-01 | Phase 1 | Pending |
| UREG-02 | Phase 1 | Pending |
| UREG-03 | Phase 1 | Pending |
| BOOK-01 | Phase 1 | Pending |
| BOOK-02 | Phase 1 | Pending |
| BOOK-03 | Phase 1 | Pending |
| BOOK-04 | Phase 1 | Pending |
| BOOK-05 | Phase 1 | Pending |
| BOOK-06 | Phase 1 | Pending |
| BOOK-07 | Phase 1 | Pending |
| ADMN-01 | Phase 1 | Pending |
| ADMN-02 | Phase 1 | Pending |
| ADMN-03 | Phase 1 | Pending |
| ADMN-04 | Phase 1 | Pending |
| ADMN-05 | Phase 1 | Pending |
| ADMN-06 | Phase 1 | Pending |
| ADMN-07 | Phase 1 | Pending |
| ADMN-08 | Phase 1 | Pending |
| COMP-01 | Phase 1 | Pending |
| COMP-02 | Phase 1 | Pending |
| COMP-03 | Phase 1 | Pending |
| TEST-01 | Phase 1 | Pending |
| TEST-02 | Phase 1 | Pending |
| TEST-03 | Phase 1 | Pending |
| TEST-04 | Phase 1 | Pending |
| TEST-05 | Phase 1 | Pending |
| TEST-06 | Phase 1 | Pending |
| ARCH-01 | Phase 1 | Pending |
| ARCH-02 | Phase 1 | Pending |
| ARCH-03 | Phase 1 | Pending |
| ARCH-04 | Phase 1 | Pending |
| SECR-01 | Phase 1 | Pending |
| SECR-02 | Phase 1 | Pending |
| SECR-03 | Phase 1 | Pending |
| SECR-04 | Phase 1 | Pending |
| SECR-05 | Phase 1 | Pending |
| SECR-06 | Phase 1 | Pending |
| INFR-01 | Phase 1 | Pending |
| INFR-02 | Phase 1 | Pending |
| INFR-03 | Phase 1 | Pending |
| INFR-04 | Phase 1 | Pending |
| INFR-05 | Phase 1 | Pending |
| INFR-06 | Phase 1 | Pending |
| INFR-07 | Phase 1 | Pending |
| INFR-08 | Phase 2 | Pending |
| CRM-01 | Phase 2 | Pending |
| CRM-02 | Phase 2 | Pending |
| CRM-03 | Phase 2 | Pending |
| CRM-04 | Phase 2 | Pending |
| CRM-05 | Phase 2 | Pending |
| CRM-06 | Phase 2 | Pending |
| KPI-01 | Phase 2 | Pending |
| KPI-02 | Phase 2 | Pending |
| KPI-03 | Phase 2 | Pending |
| KPI-04 | Phase 2 | Pending |
| KPI-05 | Phase 2 | Pending |
| KPI-06 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 48 total
- Mapped to phases: 48
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-04*
*Last updated: 2026-02-04 after roadmap creation*
