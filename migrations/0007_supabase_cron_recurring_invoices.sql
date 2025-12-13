-- Supabase Cron Setup for Recurring Invoices
-- ==========================================
-- This migration sets up a daily cron job to process recurring invoices
-- using Supabase's pg_cron and pg_net extensions.
--
-- IMPORTANT: Before running this migration, you need to:
-- 1. Replace 'YOUR_APP_URL' with your actual app URL (e.g., 'https://ollie-invoice.railway.app')
-- 2. Replace 'YOUR_CRON_SECRET' with your actual CRON_SECRET environment variable value
--
-- You can run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- ============================================
-- Step 1: Enable required extensions
-- ============================================

-- pg_cron is enabled by default on Supabase, but let's ensure it
-- Note: pg_cron can only be enabled in the 'postgres' database
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- pg_net is required for making HTTP requests from PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage on cron schema to postgres role (if needed)
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- ============================================
-- Step 2: Create the cron job
-- ============================================

-- First, remove any existing job with the same name (for idempotency)
SELECT cron.unschedule('process-recurring-invoices');

-- Schedule the recurring invoice processor to run daily at 00:01 UTC
-- Cron expression: minute hour day_of_month month day_of_week
-- '1 0 * * *' = At 00:01 (12:01 AM) every day
SELECT cron.schedule(
  'process-recurring-invoices',  -- job name (must be unique)
  '1 0 * * *',                   -- cron schedule (daily at 00:01 UTC)
  $$
  SELECT net.http_post(
    url := 'YOUR_APP_URL/api/cron/recurring-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000  -- 30 second timeout
  );
  $$
);

-- ============================================
-- Verify the job was created
-- ============================================
SELECT * FROM cron.job WHERE jobname = 'process-recurring-invoices';

-- ============================================
-- Optional: View job run history
-- ============================================
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-recurring-invoices')
-- ORDER BY start_time DESC
-- LIMIT 10;

-- ============================================
-- Optional: Manually trigger the job for testing
-- ============================================
-- SELECT cron.schedule('test-recurring-now', 'NOW', $$
-- SELECT net.http_post(
--   url := 'YOUR_APP_URL/api/cron/recurring-invoices',
--   headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
--   body := '{}'::jsonb
-- );
-- $$);

-- ============================================
-- To remove the cron job (if needed)
-- ============================================
-- SELECT cron.unschedule('process-recurring-invoices');

