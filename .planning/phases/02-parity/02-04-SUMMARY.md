# 02-04 Summary

## Objective
Build intake form upload and medical record storage for customer profiles.

## Completed
- Added Prisma models:
  - `MedicalRecordItem` -- defines record types (title, contentType, displayOrder)
  - `MedicalRecord` -- stores individual records per customer with content/imageUrl
  - Customer relation updated with `medicalRecords` field
- Created Supabase Storage utility:
  - `src/lib/storage/supabase-storage.ts`
  - Lazy-initialized client pattern (avoids build-time env var errors)
  - Functions: `uploadIntakeForm`, `getSignedUrl`, `deleteIntakeForm`
  - Uses `intake-forms` bucket
- Created medical record service:
  - `src/lib/services/medical-record.service.ts`
  - `createMedicalRecord`, `getMedicalRecords`, `getMedicalRecordsWithSignedUrls`, `deleteMedicalRecord`
  - Signed URL generation with graceful error handling
  - Delete cleans up both DB record and storage file
- Created intake API route:
  - `app/api/admin/customers/[id]/intake/route.ts`
  - GET: list records with signed URLs
  - POST: upload with file type/size validation (PDF, JPG, PNG, WEBP, max 10MB)
  - DELETE: remove record and storage file
  - Auto-creates MedicalRecordItem if none exists
- Created upload UI:
  - `app/[locale]/(admin)/admin/customers/[id]/intake-upload.tsx`
  - Drag-and-drop zone with file list, signed URL links, delete buttons
  - SWR-powered refresh after upload/delete
- Added i18n:
  - `admin.customerDetail.intake.*` keys in both locale files
- Wrote comprehensive tests:
  - `__tests__/unit/medical-record.test.ts` -- 8 tests (service CRUD, signed URLs, error handling)
  - `__tests__/unit/intake-route.test.ts` -- 11 tests (auth, validation, upload, delete)
  - All 19 tests passing

## Verification
- `npm run build` passed
- All 19 unit tests pass
- PR #29 created targeting `phase2`

## Scope Notes
- Supabase setup required: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars, `intake-forms` bucket
- Prisma migration needed: `npx prisma migrate dev`
- Component standalone; will integrate into customer-detail.tsx after both PRs merge
- CRM-05 (intake form upload) and INFR-08 (file storage) complete
