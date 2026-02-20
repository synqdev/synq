# Phase 01: User Setup Required

**Generated:** 2026-02-05
**Phase:** 01-mvp
**Status:** Incomplete

Complete these items for Resend email integration to function.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `RESEND_API_KEY` | Resend Dashboard -> API Keys -> Create API Key | `.env.local` |
| [ ] | `EMAIL_FROM` | Your verified domain email or `onboarding@resend.dev` for testing | `.env.local` |

## Account Setup

- [ ] **Create Resend account** (if needed)
  - URL: https://resend.com/signup
  - Skip if: Already have Resend account

## Dashboard Configuration

- [ ] **Verify domain** (optional, for production)
  - Location: Resend Dashboard -> Domains -> Add Domain
  - Notes: For development, use `onboarding@resend.dev` as the from address
  - For production: Verify your domain for branded sending

## Verification

After completing setup:

```bash
# Check env vars are set
grep -E "RESEND|EMAIL_FROM" .env.local

# Verify build passes
npm run build

# Test by creating a booking (email will be sent if API key is valid)
# Check Resend Dashboard -> Emails for sent emails
```

Expected results:
- Build passes
- Test booking triggers email visible in Resend Dashboard

## Local Development Notes

Without `RESEND_API_KEY`:
- Emails are skipped with a console log
- Booking flow works normally
- Use this for local development without email testing

---

**Once all items complete:** Mark status as "Complete" at top of file.
