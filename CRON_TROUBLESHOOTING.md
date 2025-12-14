# Recurring Invoices Cron Troubleshooting Guide

## 🔍 Issue: Cron Job Not Working

This guide will help you diagnose and fix issues with the recurring invoice cron job.

---

## Step 1: Check Supabase Cron Job Configuration

### Check if the cron job exists:

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor** (left sidebar)
3. Run this query:

```sql
SELECT * FROM cron.job WHERE jobname = 'process-recurring-invoices';
```

**Expected result:** You should see 1 row with:
- `jobname`: `process-recurring-invoices`
- `schedule`: `1 0 * * *`
- `command`: Should contain your app URL and cron secret

**If no results:** The cron job was never created! See "Fix A" below.

### Check cron job execution history:

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-recurring-invoices')
ORDER BY start_time DESC
LIMIT 10;
```

**Look for:**
- `status`: Should be `succeeded`
- `return_message`: Should show HTTP response from your app
- Recent `start_time` entries (should run daily at 00:01 UTC)

**Common issues:**
- ❌ **Status: `failed`** - Check the `return_message` for error details
- ❌ **No recent entries** - Cron job isn't running
- ❌ **HTTP 401 error** - CRON_SECRET mismatch
- ❌ **HTTP 500 error** - Server error, check app logs

---

## Step 2: Verify CRON_SECRET Environment Variable

### On Railway:

1. Go to your **Railway Dashboard**
2. Select your project
3. Click on **Variables** tab
4. Look for `CRON_SECRET`

**Expected:** Should be a long random string (like `a1b2c3...`)

**If missing:** Generate one and add it:

```bash
# Generate a secure secret
openssl rand -hex 32
```

Then add it to Railway and redeploy.

### Verify it's loaded in your app:

Check your server logs after deployment. You should see something indicating the app started successfully.

---

## Step 3: Check Your App URL in Supabase Cron

The cron job needs to call your actual deployed app URL.

### Check the current URL in the cron job:

```sql
SELECT command FROM cron.job WHERE jobname = 'process-recurring-invoices';
```

Look for the URL in the command. It should be your **actual Railway URL**, like:
- ✅ `https://ollie-invoice-production.up.railway.app/api/cron/recurring-invoices`
- ❌ `https://YOUR_APP_URL/api/cron/recurring-invoices` (placeholder not replaced!)

### Fix the URL if needed:

```sql
-- First, unschedule the old job
SELECT cron.unschedule('process-recurring-invoices');

-- Then create a new one with the correct URL
-- REPLACE BOTH PLACEHOLDERS BELOW:
SELECT cron.schedule(
  'process-recurring-invoices',
  '1 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR-ACTUAL-APP-URL.railway.app/api/cron/recurring-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_ACTUAL_CRON_SECRET'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
```

**⚠️ IMPORTANT:** Replace:
1. `YOUR-ACTUAL-APP-URL.railway.app` with your Railway app URL
2. `YOUR_ACTUAL_CRON_SECRET` with your actual CRON_SECRET value

---

## Step 4: Test the Cron Endpoint Manually

### Using curl:

```bash
curl -X POST "https://your-app.railway.app/api/cron/recurring-invoices" \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -v
```

**Expected response:**

```json
{
  "success": true,
  "timestamp": "2024-12-14T...",
  "duration_ms": 123,
  "processed": 0,
  "sent": 0,
  "errors": []
}
```

**Common errors:**

- **401 Unauthorized**: CRON_SECRET doesn't match
- **500 "Cron endpoint not configured"**: CRON_SECRET not set on server
- **Connection refused**: App is not running or URL is wrong

### Check the status endpoint:

```bash
curl "https://your-app.railway.app/api/cron/recurring-invoices/status" \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

This shows you:
- How many recurring invoices exist
- Which ones are due today
- Detailed info about each recurring invoice

---

## Step 5: Check Recurring Invoices in Database

### Verify you have recurring invoices:

```sql
SELECT 
  id,
  "invoiceNumber",
  "isRecurring",
  "nextRecurringDate",
  "recurringFrequency",
  "recurringEvery"
FROM invoices
WHERE "isRecurring" = true
ORDER BY "nextRecurringDate";
```

**Expected:** List of invoices with `isRecurring = true`

**Common issues:**

- ❌ **No results**: You haven't created any recurring invoices yet!
- ❌ **`nextRecurringDate` is in the future**: Invoice not due yet
- ❌ **`nextRecurringDate` is NULL**: Missing schedule data

### Check which invoices are due today:

```sql
SELECT 
  id,
  "invoiceNumber",
  "nextRecurringDate",
  "recurringFrequency"
FROM invoices
WHERE "isRecurring" = true 
  AND "nextRecurringDate" <= CURRENT_DATE
ORDER BY "nextRecurringDate";
```

**Expected:** List of invoices due for processing

---

## Step 6: Manually Trigger Cron from Supabase

If everything looks correct but the cron isn't running, you can manually trigger it:

```sql
-- One-time trigger (runs immediately)
SELECT net.http_post(
  url := 'https://YOUR-ACTUAL-APP-URL.railway.app/api/cron/recurring-invoices',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-secret', 'YOUR_ACTUAL_CRON_SECRET'
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 30000
);
```

Check the response to see if it worked!

---

## Common Root Causes

### 🔴 Issue: "Cron job never created"

**Solution:** Run the SQL from `migrations/0007_supabase_cron_recurring_invoices.sql`, but make sure to replace:
- `YOUR_APP_URL` with your actual Railway URL
- `YOUR_CRON_SECRET` with your actual secret

### 🔴 Issue: "401 Unauthorized"

**Causes:**
1. CRON_SECRET not set in Railway environment variables
2. CRON_SECRET in Supabase cron doesn't match Railway
3. Typo in the secret (extra spaces, wrong case)

**Solution:** 
- Verify the secret matches exactly in both places
- No spaces before/after the secret
- Case-sensitive!

### 🔴 Issue: "No recurring invoices processed"

**Causes:**
1. No invoices have `isRecurring = true`
2. `nextRecurringDate` is in the future
3. Invoices exist but cron never runs

**Solution:**
- Create a test recurring invoice from the UI
- Check the `nextRecurringDate` value
- Manually trigger the cron to test

### 🔴 Issue: "Cron runs but invoices not sent"

**Causes:**
1. Email service (Resend) not configured
2. Client email address missing
3. Email rate limit exceeded

**Solution:**
- Check Railway logs for email errors
- Verify RESEND_API_KEY is set
- Check client has valid email address

---

## Testing Checklist

- [ ] Supabase cron job exists (`SELECT * FROM cron.job WHERE jobname = 'process-recurring-invoices'`)
- [ ] Cron job has correct app URL (not placeholder)
- [ ] Cron job has correct CRON_SECRET (not placeholder)
- [ ] CRON_SECRET environment variable set in Railway
- [ ] Manual curl test succeeds (returns 200, not 401)
- [ ] At least one recurring invoice exists in database
- [ ] At least one invoice has `nextRecurringDate <= today`
- [ ] Manual trigger from Supabase succeeds
- [ ] Railway logs show successful cron execution

---

## Quick Diagnosis Script

You can also use this quick SQL query to see everything at once:

```sql
-- Check cron job configuration
SELECT 'Cron Job Config' as check_type, jobname, schedule, active
FROM cron.job 
WHERE jobname = 'process-recurring-invoices'

UNION ALL

-- Check last 3 cron runs
SELECT 'Last Cron Run' as check_type, 
       start_time::text as jobname,
       status as schedule,
       return_message as active
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-recurring-invoices')
ORDER BY start_time DESC
LIMIT 3;

-- Check due recurring invoices
SELECT 'Due Invoices' as check_type,
       "invoiceNumber" as jobname,
       "nextRecurringDate"::text as schedule,
       "recurringFrequency" as active
FROM invoices
WHERE "isRecurring" = true 
  AND "nextRecurringDate" <= CURRENT_DATE;
```

---

## Need More Help?

If you're still stuck:

1. **Check Railway logs**: Look for cron-related entries around 00:01 UTC
2. **Check Supabase logs**: Database > Logs for any errors
3. **Enable verbose logging**: The cron endpoint logs detailed info

The cron endpoint logs will show:
- `[CRON] Recurring invoice processing triggered at ...`
- `[CRON] Found N invoices due for processing`
- `[CRON] Completed in Xms - Processed: N, Sent: N, Errors: N`

