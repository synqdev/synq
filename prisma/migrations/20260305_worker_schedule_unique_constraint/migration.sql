-- Add unique constraint on (workerId, dayOfWeek) for recurring worker schedules.
-- NULL dayOfWeek values (specific-date entries) are unaffected: PostgreSQL treats
-- each NULL as distinct, so multiple rows with dayOfWeek IS NULL are still allowed.
CREATE UNIQUE INDEX "WorkerSchedule_workerId_dayOfWeek_key"
  ON "WorkerSchedule"("workerId", "dayOfWeek");
