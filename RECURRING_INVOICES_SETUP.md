# Recurring Invoices Cron Setup

This document explains how to set up the external cron service to trigger recurring invoice processing daily.

## Why External Cron?

The app uses an external cron service instead of in-process scheduling because:
- Railway servers can restart at any time, losing in-memory cron schedules
- External cron services are more reliable and don't depend on server uptime
- Easy to monitor and debug

## Setup Instructions

### 1. Generate a CRON_SECRET

Generate a secure random string for the cron secret. You can use:

```bash
openssl rand -hex 32
```

This will generate something like: `a1b2c3d4e5f6...` (64 characters)

### 2. Add Environment Variable to Railway

In your Railway dashboard:
1. Go to your project → Variables
2. Add a new variable:
   - **Key:** `CRON_SECRET`
   - **Value:** Your generated secret string

### 3. Set Up External Cron Service

#### Option A: Supabase Cron (Recommended - Already integrated!)

Since you're using Supabase, you can use **Supabase Cron** (pg_cron) to schedule the recurring invoice processing directly from your database. This is the most reliable option as it runs alongside your database.

**Step 1: Go to Supabase SQL Editor**
1. Open your Supabase Dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **+ New query**

**Step 2: Enable pg_net extension (for HTTP requests)**
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```
Run this query first.

**Step 3: Create the cron job**
Copy and paste this SQL, replacing the placeholders with your actual values:

```sql
-- Remove existing job (if any)
SELECT cron.unschedule('process-recurring-invoices');

-- Create the daily cron job (runs at 00:01 UTC every day)
SELECT cron.schedule(
  'process-recurring-invoices',
  '1 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR-APP-URL.railway.app/api/cron/recurring-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET_HERE'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
```

**Step 4: Verify the job was created**
```sql
SELECT * FROM cron.job WHERE jobname = 'process-recurring-invoices';
```

**Step 5: Monitor job runs (optional)**
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-recurring-invoices')
ORDER BY start_time DESC
LIMIT 10;
```

> 📖 For more details, see: https://supabase.com/docs/guides/cron

#### Option B: cron-job.org (Alternative - Free)

1. Go to [cron-job.org](https://cron-job.org) and create a free account
2. Click "CREATE CRONJOB"
3. Configure:
   - **Title:** Ollie Invoice - Recurring Invoices
   - **URL:** `https://your-app.railway.app/api/cron/recurring-invoices`
   - **Schedule:** Custom → `1 0 * * *` (runs at 00:01 UTC daily)
   - **Request Method:** POST
   - **Request Headers:** Add header `x-cron-secret` with your CRON_SECRET value
4. Save and enable the cron job

#### Option C: EasyCron (Alternative - Free tier available)

1. Go to [easycron.com](https://www.easycron.com) and create an account
2. Create a new cron job:
   - **URL:** `https://your-app.railway.app/api/cron/recurring-invoices?secret=YOUR_CRON_SECRET`
   - **When to execute:** `1 0 * * *`
   - **HTTP Method:** POST
3. Save and activate

#### Option D: Using URL Query Parameter (Simpler)

If your cron service doesn't support custom headers, use the query parameter method:

```
POST https://your-app.railway.app/api/cron/recurring-invoices?secret=YOUR_CRON_SECRET
```

### 4. Timezone Considerations

- The cron schedule `1 0 * * *` runs at 00:01 UTC
- If you need a different timezone, adjust the cron expression accordingly
- Example for EST (UTC-5): `1 5 * * *` runs at 00:01 EST

### 5. Testing the Endpoint

You can manually test the endpoint:

```bash
curl -X POST "https://your-app.railway.app/api/cron/recurring-invoices" \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "timestamp": "2024-01-15T00:01:00.000Z",
  "duration_ms": 1234,
  "processed": 2,
  "sent": 2,
  "errors": []
}
```

## Monitoring

### Server Logs

The cron endpoint logs detailed information:
- `[CRON] Recurring invoice processing triggered at ...` - When triggered
- `[CRON] Completed in Xms - Processed: N, Sent: N, Errors: N` - Results

### cron-job.org Dashboard

If using cron-job.org, you can view:
- Execution history
- Response status codes
- Response body (shows processed/sent counts)

## Backup: In-Process Cron

The app also has a backup in-process cron job (`node-cron`) that:
- Runs at 00:01 server time
- Processes missed invoices on server startup

This provides redundancy but should not be relied upon as the primary trigger.

## Troubleshooting

### "Unauthorized" Error (401)
- Check that CRON_SECRET is set in Railway
- Verify the secret matches exactly (no extra spaces)
- Ensure you're sending the secret via header or query param

### "Cron endpoint not configured" Error (500)
- CRON_SECRET environment variable is not set in Railway
- Redeploy the app after adding the variable

### No Invoices Being Processed
- Check that recurring invoices have `nextRecurringDate` set to today or earlier
- Verify invoices have `isRecurring: true`
- Check server logs for detailed processing information


