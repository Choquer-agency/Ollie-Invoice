# 🔧 Cron Issue - Quick Fix Guide

## What I've Created For You

I've created several diagnostic tools to help you fix the recurring invoice cron job:

### 1. **Comprehensive Troubleshooting Guide** 
📄 `CRON_TROUBLESHOOTING.md`

This document walks you through:
- Step-by-step diagnosis process
- Common root causes and fixes
- Testing procedures
- Quick checks for each component

### 2. **Automated Test Script**
📄 `script/test-cron.ts`

Run this to automatically test your cron endpoint:

```bash
npm run test-cron https://your-app.railway.app YOUR_CRON_SECRET
```

This will:
- ✅ Check cron status and show what invoices are due
- ✅ Manually trigger the cron job
- ✅ Show detailed results and identify issues
- ✅ Provide specific recommendations

### 3. **Supabase SQL Diagnostics**
📄 `migrations/cron_diagnostics.sql`

Copy and paste these SQL queries into your Supabase SQL Editor to:
- Check if cron job exists
- View execution history
- See which invoices are due
- Manually trigger the job
- Recreate the cron job if needed

---

## 🚀 Quick Diagnosis (3 Steps)

### Step 1: Check Your Supabase Cron Job

Go to Supabase → SQL Editor → Run:

```sql
SELECT * FROM cron.job WHERE jobname = 'process-recurring-invoices';
```

**Look for:**
- ❌ **No results?** → The cron job was never created
- ❌ **Contains `YOUR_APP_URL`?** → You didn't replace the placeholder
- ❌ **Contains `YOUR_CRON_SECRET`?** → You didn't replace the placeholder

**If any of the above:** Go to `migrations/cron_diagnostics.sql` and run section #6 to recreate it properly.

### Step 2: Test the Endpoint

Run the test script:

```bash
npm run test-cron https://your-app.railway.app YOUR_CRON_SECRET
```

Replace with your actual values!

**Common issues:**
- 🔴 **401 Unauthorized** → CRON_SECRET doesn't match on server
- 🔴 **500 "not configured"** → CRON_SECRET not set in Railway env variables
- 🔴 **Connection error** → Wrong URL or app not running

### Step 3: Check Execution History

In Supabase SQL Editor:

```sql
SELECT status, return_message, start_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-recurring-invoices')
ORDER BY start_time DESC
LIMIT 5;
```

**Look for:**
- ✅ `status = 'succeeded'` and recent timestamps → Working!
- ❌ `status = 'failed'` → Check `return_message` for error
- ❌ No recent runs → Cron isn't executing

---

## 🔍 Most Common Issues

### Issue #1: Placeholders Not Replaced

**Problem:** The SQL migration file has `YOUR_APP_URL` and `YOUR_CRON_SECRET` that you need to replace.

**Fix:** 
1. Get your Railway app URL (e.g., `https://ollie-invoice-production.up.railway.app`)
2. Get/create your CRON_SECRET from Railway variables
3. Run section #6 in `migrations/cron_diagnostics.sql` with real values

### Issue #2: CRON_SECRET Not Set

**Problem:** Environment variable `CRON_SECRET` not set in Railway.

**Fix:**
1. Generate: `openssl rand -hex 32`
2. Add to Railway → Your Project → Variables → `CRON_SECRET` = (paste value)
3. Redeploy
4. Update the Supabase cron job with the same secret

### Issue #3: No Recurring Invoices Due

**Problem:** Everything is set up correctly, but no invoices are due yet.

**Check:**

```sql
SELECT "invoiceNumber", "nextRecurringDate", CURRENT_DATE as today
FROM invoices
WHERE "isRecurring" = true;
```

If `nextRecurringDate` is in the future, the cron is working but nothing is due yet!

---

## 📞 Getting Help

If you're still stuck after going through these steps:

1. Run the test script and paste the output
2. Run the diagnostic SQL queries and paste results
3. Check Railway logs around 00:01 UTC for cron-related messages

The diagnostic tools will give you specific error messages that pinpoint the exact issue!

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ `npm run test-cron` shows "processed" and "sent" counts
2. ✅ Supabase `cron.job_run_details` shows `status = 'succeeded'`
3. ✅ New invoices appear in your dashboard after cron runs
4. ✅ Emails are sent to clients
5. ✅ `nextRecurringDate` updates on template invoices

---

## 🎯 Next Steps

1. **First:** Run the test script to quickly identify the issue
2. **Then:** Use the troubleshooting guide for detailed fixes
3. **Finally:** Use the SQL diagnostics to verify everything in Supabase

All the tools are ready to go! Just replace the placeholder values with your actual app URL and cron secret.

