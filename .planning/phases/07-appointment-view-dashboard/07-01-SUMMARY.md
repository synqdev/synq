---
phase: 07-appointment-view-dashboard
plan: 01
subsystem: data-layer
tags: [api, prisma, i18n, settings]
key-files:
  created:
    - prisma/schema.prisma (AdminSettings model added)
    - app/api/admin/appointment/[id]/route.ts
    - app/api/admin/appointment/today/route.ts
    - app/api/admin/settings/route.ts
  modified:
    - messages/ja.json
    - messages/en.json
decisions:
  - "Used admin.settingsPage instead of admin.settings for i18n namespace to avoid collision with existing admin.settings string key"
metrics:
  completed: 2026-03-08
  tasks: 2/2
---

# Phase 7 Plan 01: Data Layer (AdminSettings, APIs, i18n) Summary

AdminSettings Prisma model, three API endpoints (appointment detail, today's bookings, settings CRUD), and i18n keys for all Phase 7 pages.

## Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | AdminSettings model + API endpoints | 0110977 | prisma/schema.prisma, app/api/admin/appointment/[id]/route.ts, app/api/admin/appointment/today/route.ts, app/api/admin/settings/route.ts |
| 2 | i18n translation keys | 2205c00 | messages/ja.json, messages/en.json |

## What Was Built

### AdminSettings Prisma Model
Single-row settings table with fields: aiProvider, businessType, autoTranscribe, recordingLang, audioQuality. Uses `@id @default("default")` pattern for singleton row. Schema synced via `prisma db push`.

### API Endpoints

1. **GET /api/admin/appointment/[id]** - Returns booking with full includes: customer (id, name, email, phone, locale, notes), worker (id, name, nameEn), service (id, name, nameEn, duration), karuteRecords (id, status, createdAt desc), recordingSessions (id, status, startedAt desc). Auth guarded, 404 on missing.

2. **GET /api/admin/appointment/today** - Returns today's bookings filtered by date (query param, defaults to today in JST), excludes CANCELLED, ordered by startsAt asc. Each booking includes computed `hasKarute` boolean and `karuteStatus`. Follows existing calendar API pattern.

3. **GET+PUT /api/admin/settings** - GET uses upsert to ensure default row exists. PUT validates body with Zod schema, upserts settings. Returns full settings object.

### i18n Keys
Four new namespaces added to both ja.json and en.json:
- `admin.appointment` - appointment page labels, summary bar, karute actions
- `admin.sidebar` - sidebar navigation labels
- `admin.today` - today's appointments dashboard tab
- `admin.settingsPage` - global settings page form labels and options

## Deviations from Plan

### 1. [Rule 3 - Naming] Used `admin.settingsPage` instead of `admin.settings` for i18n namespace
- **Found during:** Task 2
- **Issue:** The plan specified `admin.settings` namespace, but `admin.settings` already exists as a string value ("Settings"/"設定") in both locale files
- **Fix:** Named the namespace `admin.settingsPage` to avoid collision with the existing key
- **Files modified:** messages/ja.json, messages/en.json

## Verification

- `npx prisma db push` succeeded without errors
- `npm run build` passed with zero TypeScript errors
- All API routes visible in build output
- i18n keys parse correctly in both locales

## Self-Check: PASSED
