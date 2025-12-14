-- ============================================
-- Supabase Cron Job Diagnostics
-- ============================================
-- Run these queries in your Supabase SQL Editor
-- to diagnose recurring invoice cron issues

-- ============================================
-- 1. CHECK IF CRON JOB EXISTS
-- ============================================
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active,
  database
FROM cron.job 
WHERE jobname = 'process-recurring-invoices';

-- Expected result: 1 row showing your cron job
-- If no results: The cron job was never created!
-- Check: Does the command contain YOUR_APP_URL placeholder? Replace it!
-- Check: Does the command contain YOUR_CRON_SECRET placeholder? Replace it!

-- ============================================
-- 2. CHECK CRON JOB EXECUTION HISTORY
-- ============================================
SELECT 
  runid,
  jobid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid = (
  SELECT jobid 
  FROM cron.job 
  WHERE jobname = 'process-recurring-invoices'
)
ORDER BY start_time DESC
LIMIT 10;

-- What to look for:
-- - status = 'succeeded' ✅ (good!)
-- - status = 'failed' ❌ (check return_message for details)
-- - Recent start_time entries (should run daily at 00:01 UTC)
-- - Check return_message for HTTP response from your app

-- Common return_message values:
-- - HTTP 200 + JSON response = Success! ✅
-- - HTTP 401 = CRON_SECRET mismatch ❌
-- - HTTP 500 = Server error ❌
-- - Connection timeout = App not responding ❌

-- ============================================
-- 3. CHECK RECURRING INVOICES IN DATABASE
-- ============================================
SELECT 
  id,
  "invoiceNumber",
  "businessId",
  "clientId",
  total,
  "isRecurring",
  "recurringFrequency",
  "recurringEvery",
  "nextRecurringDate",
  "recurringEndDate",
  "createdAt"
FROM invoices
WHERE "isRecurring" = true
ORDER BY "nextRecurringDate";

-- What to look for:
-- - Count > 0 (you have recurring invoices)
-- - nextRecurringDate should be set and not NULL
-- - Check if any nextRecurringDate <= today

-- ============================================
-- 4. CHECK WHICH INVOICES ARE DUE TODAY
-- ============================================
SELECT 
  id,
  "invoiceNumber",
  "nextRecurringDate",
  "recurringFrequency",
  "recurringEvery",
  DATE(CURRENT_TIMESTAMP) as today,
  CASE 
    WHEN "nextRecurringDate" <= DATE(CURRENT_TIMESTAMP) THEN 'DUE ✅'
    ELSE 'NOT DUE'
  END as status
FROM invoices
WHERE "isRecurring" = true
ORDER BY "nextRecurringDate";

-- Expected: List showing which invoices are due today
-- If no DUE invoices: The cron would process 0 invoices (normal if none are due)

-- ============================================
-- 5. MANUALLY TRIGGER THE CRON JOB NOW
-- ============================================
-- ⚠️ WARNING: Only run this if you want to test immediately!
-- Replace YOUR_APP_URL and YOUR_CRON_SECRET with actual values

/*
SELECT net.http_post(
  url := 'https://YOUR_APP_URL.railway.app/api/cron/recurring-invoices',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-secret', 'YOUR_CRON_SECRET'
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 30000
) as result;
*/

-- The response will show in the 'result' column
-- Look for: {"success": true, "processed": X, "sent": Y}

-- ============================================
-- 6. RECREATE THE CRON JOB (IF NEEDED)
-- ============================================
-- Only run this if:
-- - The cron job doesn't exist, OR
-- - The URL/secret contains placeholder text, OR
-- - You need to update the schedule

-- Step 1: Remove existing job
SELECT cron.unschedule('process-recurring-invoices');

-- Step 2: Create new job with CORRECT values
-- ⚠️ IMPORTANT: Replace YOUR_APP_URL and YOUR_CRON_SECRET!
/*
SELECT cron.schedule(
  'process-recurring-invoices',
  '1 0 * * *',  -- Runs at 00:01 UTC every day
  $$
  SELECT net.http_post(
    url := 'https://YOUR_APP_URL.railway.app/api/cron/recurring-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET_HERE'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
*/

-- Step 3: Verify it was created
SELECT * FROM cron.job WHERE jobname = 'process-recurring-invoices';

-- ============================================
-- 7. CHECK NEXT SCHEDULED RUN TIME
-- ============================================
SELECT 
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  active
FROM cron.job 
WHERE jobname = 'process-recurring-invoices';

-- The 'schedule' field shows when it runs
-- '1 0 * * *' means: minute=1, hour=0 (00:01 UTC), every day

-- To convert to your timezone:
-- UTC 00:01 = 
--   - EST: 7:01 PM previous day (UTC-5)
--   - PST: 4:01 PM previous day (UTC-8)
--   - CET: 1:01 AM (UTC+1)

-- ============================================
-- 8. CHECK PG_NET EXTENSION (Required for HTTP)
-- ============================================
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- Expected: 1 row
-- If no results: pg_net is not installed!
-- Fix: Run this first:
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- 9. COMPREHENSIVE DIAGNOSTIC QUERY
-- ============================================
-- Run this to see everything at once
WITH cron_info AS (
  SELECT 
    'Cron Job' as category,
    CASE 
      WHEN COUNT(*) > 0 THEN '✅ EXISTS'
      ELSE '❌ NOT FOUND'
    END as status,
    MAX(schedule) as detail
  FROM cron.job 
  WHERE jobname = 'process-recurring-invoices'
),
last_run AS (
  SELECT 
    'Last Run' as category,
    COALESCE(MAX(status), 'NEVER RUN') as status,
    TO_CHAR(MAX(start_time), 'YYYY-MM-DD HH24:MI:SS') as detail
  FROM cron.job_run_details 
  WHERE jobid = (
    SELECT jobid FROM cron.job WHERE jobname = 'process-recurring-invoices'
  )
),
recurring_count AS (
  SELECT 
    'Recurring Invoices' as category,
    COUNT(*)::text as status,
    COUNT(*) FILTER (WHERE "nextRecurringDate" <= CURRENT_DATE)::text || ' due today' as detail
  FROM invoices
  WHERE "isRecurring" = true
)
SELECT * FROM cron_info
UNION ALL
SELECT * FROM last_run
UNION ALL
SELECT * FROM recurring_count;

-- This gives you a quick overview:
-- - Does cron job exist?
-- - When did it last run and what was the status?
-- - How many recurring invoices exist and how many are due?

-- ============================================
-- TROUBLESHOOTING CHECKLIST
-- ============================================
-- 
-- ✅ Cron job exists in cron.job table
-- ✅ Cron job has correct app URL (not placeholder)
-- ✅ Cron job has correct CRON_SECRET (not placeholder)
-- ✅ pg_net extension is installed
-- ✅ Cron job is active (active = true)
-- ✅ Last run status was 'succeeded'
-- ✅ At least one recurring invoice exists
-- ✅ At least one invoice has nextRecurringDate <= today
-- 
-- If all checked and still not working:
-- 1. Check Railway logs for cron-related errors
-- 2. Verify CRON_SECRET environment variable is set in Railway
-- 3. Try manual trigger (query #5) to test the endpoint
-- 4. Check return_message in cron.job_run_details for clues

