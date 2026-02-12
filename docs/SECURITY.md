# SYNQ Security Configuration

This document describes the security measures implemented in SYNQ.

## Security Requirements (SECR)

| ID | Requirement | Status | Implementation |
|-----|-------------|--------|----------------|
| SECR-01 | RLS policies on all tables | Complete | `prisma/migrations/20260204_rls_policies/migration.sql` |
| SECR-02 | Zod validation on all endpoints | Complete | `src/lib/validations/*.ts` |
| SECR-03 | Admin routes protected by auth | Complete | `middleware.ts` + `getAdminSession()` |
| SECR-04 | Secrets in environment variables | Complete | All secrets via `process.env` |
| SECR-05 | Rate limiting on booking endpoint | Complete | `src/lib/rate-limit.ts` |
| SECR-06 | Parameterized queries only | Complete | Prisma ORM enforces parameterization |

## Row Level Security (RLS)

RLS is enabled on all database tables to provide defense-in-depth access control.

### Policies Overview

| Table | Public Read | User Write | Admin Access |
|-------|-------------|------------|--------------|
| Worker | Yes | No | Full |
| Service | Yes | No | Full |
| Resource | Yes | No | Full |
| WorkerSchedule | Yes | No | Full |
| Customer | Own only | Own only | Full |
| Booking | Own only | Create own | Full |

### Session Variables

RLS policies use PostgreSQL session variables:
- `app.customer_id`: UUID of the current customer
- `app.role`: 'admin' or 'user'

Set via `withRLSContext()` utility in `src/lib/db/rls-context.ts`.

## Rate Limiting

Implemented using Upstash Redis for distributed rate limiting.

### Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Booking (POST) | 10 requests | 1 minute |
| General API | 100 requests | 1 minute |

### Development Mode

Falls back to no rate limiting if `UPSTASH_REDIS_REST_URL` is not configured.

## Input Validation

All API endpoints and server actions validate input using Zod schemas:

- `src/lib/validations/booking.ts` - Booking creation/cancellation
- `src/lib/validations/customer.ts` - Customer registration
- `src/lib/validations/worker.ts` - Worker CRUD
- `src/lib/validations/service.ts` - Service CRUD
- `src/lib/validations/resource.ts` - Resource CRUD
- `src/lib/validations/admin-booking.ts` - Admin booking operations

## Admin Authentication

### Flow

1. Admin submits username/password to login form
2. Credentials verified against `ADMIN_USERNAME` and `ADMIN_PASSWORD` env vars
3. JWT token created using `jose` library (HS256, 24h expiry)
4. Token stored in httpOnly, secure cookie
5. Middleware checks cookie presence for admin routes
6. Pages/layouts verify full JWT signature

### Environment Variables

```
ADMIN_USERNAME=<admin username>
ADMIN_PASSWORD=<admin password>
ADMIN_SESSION_SECRET=<32+ char random string>
```

**Important:** Always set `ADMIN_SESSION_SECRET` to a unique random string in production.

## SQL Injection Prevention

All database queries use Prisma ORM which enforces parameterized queries. The only raw SQL is in `src/lib/db/rls-context.ts` which uses Prisma's tagged template literals (automatically parameterized).

## Environment Variables

All secrets are stored in environment variables. See `.env.example` for required variables.

**Never commit `.env` files. The repository is configured to ignore them.**

## HTTPS

In production, all traffic should be served over HTTPS. The admin session cookie is marked `secure: true` in production environments.

## Error Tracking and Observability

Sentry is configured for production error tracking and performance monitoring.

### Features

- **Error Capture**: All unhandled errors automatically captured
- **Performance Monitoring**: Transaction traces for API routes and server actions
- **Session Replay**: Visual reproduction of user sessions with errors (privacy-first with text masking)
- **Tagged Errors**: Booking service errors tagged for easy filtering

### Configuration

```
NEXT_PUBLIC_SENTRY_DSN=<your sentry dsn>
SENTRY_AUTH_TOKEN=<your auth token for source maps>
```

Sentry is disabled if `NEXT_PUBLIC_SENTRY_DSN` is not set, making it optional for development.

### Sample Rates

| Environment | Traces | Session Replay | Error Replay |
|-------------|--------|----------------|--------------|
| Development | 100% | 10% | 100% |
| Production | 10% | 10% | 100% |
