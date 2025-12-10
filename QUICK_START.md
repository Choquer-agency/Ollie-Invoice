# 🎯 Admin Dashboard - Quick Start Checklist

Complete these steps to enable automatic invoice generation for your Ollie Invoice subscriptions.

## ✅ Step-by-Step Setup

### 1️⃣ Apply Database Migration

Run this command to add admin fields to your database:

```bash
cd /Users/brycechoquer/Desktop/Ollie-Invoice
npm run db:push
```

**Expected Result:** Migration adds `is_admin` to users table and `is_ollie_business` to businesses table.

---

### 2️⃣ Set Your Account as Admin

**Option A: Quick SQL (Recommended)**

1. Go to your Supabase Dashboard → SQL Editor
2. Copy and paste this (replace with your email):

```sql
UPDATE users 
SET is_admin = true 
WHERE email = 'bryce@example.com';
```

3. Click "Run"
4. Verify with:

```sql
SELECT email, first_name, last_name, is_admin 
FROM users 
WHERE is_admin = true;
```

**Option B: Use the Helper Script**

```bash
npx tsx script/set-admin.ts bryce@example.com
```

---

### 3️⃣ Log In and Access Admin

1. Open Ollie Invoice in your browser
2. Log in with your admin account
3. Look for the **👑 Admin** menu item in the sidebar
4. Click it to access the admin dashboard

---

### 4️⃣ Set Up Your Ollie Business

1. On the admin dashboard, click **"Setup Ollie Business"**
2. Fill in your business details:

   ```
   Business Name: Ollie Invoice
   Email: your-billing-email@example.com
   Phone: +1 (555) 123-4567
   Address: Your business address
   Website: https://ollieinvoice.com
   Currency: USD
   ```

3. Click **"Create Business"**

---

### 5️⃣ Test the System

**Test Automatic Invoice Generation:**

1. Subscribe a test business to Pro ($10/month)
2. Complete Stripe checkout
3. Go to `/admin` dashboard
4. You should see:
   - ✅ New invoice marked as "Paid"
   - ✅ Invoice amount: $10.00
   - ✅ Client added to client list
   - ✅ Stats updated

---

## 🎉 You're Done!

### What Happens Now?

**When Someone Subscribes:**
1. Customer completes Stripe checkout
2. Webhook fires `checkout.session.completed`
3. Invoice automatically created from Ollie → Customer
4. Invoice marked as "Paid" for $10
5. Appears in your admin dashboard

**Every Month (Recurring):**
1. Stripe charges customer's card
2. Webhook fires `invoice.payment_succeeded`
3. New invoice created for that month
4. Invoice marked as "Paid" for $10
5. Customer builds invoice history

---

## 📊 Admin Dashboard Features

### Dashboard View (`/admin`)
- 💰 Total Revenue (all paid invoices)
- 📄 Outstanding invoices
- ⚠️ Overdue invoices
- 👥 Active clients count
- 📋 Recent invoices table

### Setup Page (`/admin/setup`)
- ✏️ Edit business information
- 🎨 Update branding details
- 💱 Change currency
- 📧 Update contact info

---

## 🔐 Security Notes

- ✅ Only users with `is_admin = true` can access admin routes
- ✅ Regular users cannot see the Admin menu
- ✅ All admin endpoints protected by middleware
- ✅ No security vulnerabilities introduced

---

## 🐛 Troubleshooting

### ❌ Can't see Admin menu
**Fix:** 
```sql
-- Verify admin flag is set
SELECT email, is_admin FROM users WHERE email = 'your-email@example.com';

-- If is_admin is false, set it to true
UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';
```

### ❌ Invoices not generating
**Check:**
1. Is Ollie business set up? (Go to `/admin/setup`)
2. Are webhooks configured in Stripe?
3. Check server logs: `npm run dev` (look for webhook errors)
4. Verify `STRIPE_WEBHOOK_SECRET` in `.env`

### ❌ Migration fails
**Fix:**
1. Check `.env` has `DATABASE_URL`
2. Verify database connection
3. Try running: `npm run db:push` again

---

## 📝 Important Files

| File | Purpose |
|------|---------|
| `ADMIN_IMPLEMENTATION.md` | Complete implementation details |
| `ADMIN_SETUP.md` | Detailed setup guide |
| `migrations/0003_add_admin_and_ollie_business.sql` | Database migration |
| `migrations/set_admin_user.sql` | Helper SQL to set admin |
| `script/set-admin.ts` | Helper script to set admin |

---

## 🎯 Next Actions After Setup

1. ✅ Test with a real subscription
2. ✅ Verify invoices appear in `/admin`
3. ✅ Download a sample PDF invoice
4. ✅ Check that monthly renewals generate new invoices
5. ✅ Review invoice details and formatting

---

## 💡 Pro Tips

- **Admin URL:** Bookmark `/admin` for quick access
- **Multiple Admins:** Run the SQL/script for each admin user
- **Backup:** Your existing business remains separate from Ollie business
- **Invoices:** Each customer gets their own client record
- **PDFs:** All invoices can be downloaded as PDFs

---

## 🆘 Need Help?

1. Check server logs: Look for webhook events and errors
2. Check Stripe Dashboard: View webhook event history
3. Check database: Verify `is_ollie_business = true` exists
4. Review docs: See `ADMIN_SETUP.md` for detailed troubleshooting

---

**Current Status:** ✅ All code implemented and ready to use!

**Required Action:** Run the 5 steps above to activate the admin dashboard.

---

Good luck! 🚀


