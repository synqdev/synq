# 02-03 Summary

## Objective
Build the customer detail page with booking history and editable notes.

## Completed
- Extended customer service with detail functions:
  - `getCustomerDetail(id)` in `src/lib/services/customer.service.ts`
  - Returns customer with bookings (last 50), computed visitCount, lastVisitDate, nextBookingDate
  - `updateCustomerNotes(id, notes)` for saving admin notes
  - `updateCustomerAssignedStaff(id, assignedStaffId)` for staff assignment
- Added Zod validation:
  - `updateCustomerNotesSchema` in `src/lib/validations/customer.ts`
- Created API endpoints:
  - `GET /api/admin/customers/[id]` -- customer detail with bookings
  - `PUT /api/admin/customers/[id]/notes` -- update notes and assigned staff
  - Both admin auth-protected
- Created customer detail page:
  - `app/[locale]/(admin)/admin/customers/[id]/page.tsx` -- server component with auth guard
  - `app/[locale]/(admin)/admin/customers/[id]/customer-detail.tsx` -- client component
  - Sections: customer info, editable notes, assigned staff dropdown, booking history table
  - SWR-powered data fetching
- Updated i18n:
  - Added `admin.customerDetail.*` keys in `messages/en.json` and `messages/ja.json`

## Verification
- `npm run build` passed
- PR #26 created targeting `phase2`

## Scope Notes
- Medical records section placeholder included (populated by 02-04)
- CRM-02 (view profile), CRM-03 (booking history), CRM-04 (notes) complete
