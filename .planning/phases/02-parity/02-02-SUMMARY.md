# 02-02 Summary

## Objective
Build admin customer list with search, staff filter, pagination, and sortable tabular UI.

## Completed
- Extended customer service with CRM list query:
  - `getCustomerList()` in `src/lib/services/customer.service.ts`
  - Computes `visitCount`, `lastVisitDate`, and `nextBookingDate` from actual confirmed bookings
  - Supports search, assigned staff filtering, pagination, and sort parameters
- Added admin customer list API:
  - `GET /api/admin/customers` in `app/api/admin/customers/route.ts`
  - Admin auth check, Zod query validation, paginated JSON response
- Added admin customers page:
  - `app/[locale]/(admin)/admin/customers/page.tsx`
  - Server auth guard + worker list preload for filter UI
- Added customers list client UI:
  - `app/[locale]/(admin)/admin/customers/customer-list.tsx`
  - Debounced search, assigned staff filter, pagination controls
  - Uses shared `DataTable` component (Storybook table) for list rendering and sortable columns
  - Row links to `/admin/customers/[id]` for next-plan detail page
- Added customer list query validation schema:
  - `customerListQuerySchema` in `src/lib/validations/customer.ts`
- Updated admin navigation and i18n:
  - Added Customers tab in `app/[locale]/(admin)/admin-nav.tsx`
  - Added `admin.nav.customers` and `admin.customersPage.*` keys in:
    - `messages/ja.json`
    - `messages/en.json`

## Verification
- `npm run build` passed (Next.js compile, type check, and route generation successful)

## Scope Notes
- Kept this plan scoped to list/search/filter/pagination entrypoint only.
- Customer detail, notes editing, and intake upload remain in subsequent plans.
