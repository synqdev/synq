-- SYNQ Row Level Security (RLS) Policies
-- This migration enables RLS on all tables and creates access control policies.
--
-- RLS Context Variables:
--   app.customer_id - UUID of the current customer (for customer-scoped queries)
--   app.role - 'admin' or 'user' (for role-based access)
--
-- Note: Prisma operates with full access by default. These policies provide
-- defense-in-depth and enable secure direct Supabase queries when needed.

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE "Worker" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Resource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkerSchedule" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- WORKER POLICIES
-- Public read (customers need to see worker availability)
-- Admin write (only admins can create/update/delete workers)
-- ============================================================================

CREATE POLICY "Workers are viewable by everyone"
  ON "Worker" FOR SELECT
  USING (true);

CREATE POLICY "Workers are manageable by admin"
  ON "Worker" FOR ALL
  USING (current_setting('app.role', true) = 'admin');

-- ============================================================================
-- SERVICE POLICIES
-- Public read (customers need to see available services)
-- Admin write (only admins can manage services)
-- ============================================================================

CREATE POLICY "Services are viewable by everyone"
  ON "Service" FOR SELECT
  USING (true);

CREATE POLICY "Services are manageable by admin"
  ON "Service" FOR ALL
  USING (current_setting('app.role', true) = 'admin');

-- ============================================================================
-- RESOURCE POLICIES
-- Public read (availability checks need resource info)
-- Admin write (only admins can manage beds/resources)
-- ============================================================================

CREATE POLICY "Resources are viewable by everyone"
  ON "Resource" FOR SELECT
  USING (true);

CREATE POLICY "Resources are manageable by admin"
  ON "Resource" FOR ALL
  USING (current_setting('app.role', true) = 'admin');

-- ============================================================================
-- CUSTOMER POLICIES
-- Own record access (customers can view/update their own record)
-- Admin full access (admins can view all customers)
-- ============================================================================

CREATE POLICY "Customers can view own record"
  ON "Customer" FOR SELECT
  USING (
    id::text = current_setting('app.customer_id', true)
    OR current_setting('app.role', true) = 'admin'
  );

CREATE POLICY "Customers can update own record"
  ON "Customer" FOR UPDATE
  USING (id::text = current_setting('app.customer_id', true));

CREATE POLICY "Admin can manage all customers"
  ON "Customer" FOR ALL
  USING (current_setting('app.role', true) = 'admin');

CREATE POLICY "New customers can be created"
  ON "Customer" FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- BOOKING POLICIES
-- Own bookings (customers can view their own bookings)
-- Create own bookings (customers can create bookings for themselves)
-- Admin full access (admins can view/manage all bookings)
-- ============================================================================

CREATE POLICY "Customers can view own bookings"
  ON "Booking" FOR SELECT
  USING (
    "customerId"::text = current_setting('app.customer_id', true)
    OR current_setting('app.role', true) = 'admin'
  );

CREATE POLICY "Customers can create own bookings"
  ON "Booking" FOR INSERT
  WITH CHECK (
    "customerId"::text = current_setting('app.customer_id', true)
    OR current_setting('app.role', true) = 'admin'
  );

CREATE POLICY "Admin can manage all bookings"
  ON "Booking" FOR ALL
  USING (current_setting('app.role', true) = 'admin');

-- ============================================================================
-- WORKER SCHEDULE POLICIES
-- Public read (availability checks need schedule info)
-- Admin write (only admins can block/unblock time)
-- ============================================================================

CREATE POLICY "WorkerSchedule viewable by everyone"
  ON "WorkerSchedule" FOR SELECT
  USING (true);

CREATE POLICY "WorkerSchedule manageable by admin"
  ON "WorkerSchedule" FOR ALL
  USING (current_setting('app.role', true) = 'admin');
