-- ============================================
-- Update Cron Schedule to 8am PST
-- ============================================

-- Remove the existing cron job
SELECT cron.unschedule('process-recurring-invoices');

-- Create new cron job scheduled for 8am PST (16:00 UTC)
-- Note: This uses PST (UTC-8). During PDT (summer), it will be 9am Pacific time.
SELECT cron.schedule(
  'process-recurring-invoices',
  '0 16 * * *',  -- Runs daily at 16:00 UTC = 8:00 AM PST
  $$
  SELECT net.http_post(
    url := 'https://www.ollieinvoice.com/api/cron/recurring-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'ff6d57cdc0daea7ab2265b539f090a4e5a85dc85903dbfdec498ef36884abcd7'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Verify the updated schedule
SELECT 
  jobname,
  schedule,
  active,
  database
FROM cron.job 
WHERE jobname = 'process-recurring-invoices';

-- ============================================
-- IMPORTANT: Daylight Saving Time Note
-- ============================================
-- 
-- UTC doesn't observe daylight saving time, so:
-- 
-- Winter (PST = UTC-8):
--   16:00 UTC = 8:00 AM PST ✅
-- 
-- Summer (PDT = UTC-7):  
--   16:00 UTC = 9:00 AM PDT
-- 
-- If you want it to ALWAYS run at 8am Pacific time regardless
-- of daylight saving, you would need to manually update the 
-- schedule twice a year:
--   - Spring forward: Change to '0 15 * * *' (for 8am PDT)
--   - Fall back: Change to '0 16 * * *' (for 8am PST)
-- 
-- Or, if you want 8am year-round adjusted for DST, use '0 15 * * *'
-- which will be:
--   - 8:00 AM PDT (summer)
--   - 7:00 AM PST (winter)
-- ============================================

